using Microsoft.AspNetCore.Http;
using System.Net.Http;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;

public class SimpleProxyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SimpleProxyMiddleware> _logger;

    // Route mappings: prefix -> (serviceName, targetPathPrefix)
    private static readonly Dictionary<string, (string Service, string TargetPrefix)> RouteMappings = new()
    {
        { "/api/auth", ("auth-service", "/api/Auth") },
        { "/api/kyc", ("auth-service", "/api/Kyc") },
        { "/api/role", ("auth-service", "/api/Role") },
        { "/api/booking", ("booking-service", "/api/Bookings") },
        { "/api/payment", ("payment-service", "/api/Payment") },
        { "/api/paymentmethods", ("payment-service", "/api/PaymentMethods") },
        { "/api/shared-fund", ("payment-service", "/api/SharedFund") },
        { "/api/ownership", ("ownership-service", "/api") },
        { "/api/coowners", ("ownership-service", "/api/CoOwners") },
        { "/api/CoOwners", ("ownership-service", "/api/CoOwners") },
        { "/api/vehicles", ("ownership-service", "/api/Vehicles") },
        { "/api/econtract", ("ownership-service", "/api/EContract") },
        { "/api/groups", ("ownership-service", "/api/Group") },
        { "/api/voting", ("ownership-service", "/api/Voting") },
        { "/api/Voting", ("ownership-service", "/api/Voting") },
        { "/api/fund", ("ownership-service", "/api/SharedFund") },
        { "/api/VehicleGroups", ("ownership-service", "/api/VehicleGroups") },
        { "/api/Ownerships", ("ownership-service", "/api/Ownerships") },
        { "/api/EContracts", ("ownership-service", "/api/EContracts") },
        { "/api/GroupFunds", ("ownership-service", "/api/GroupFunds") },
        { "/api/disputes", ("ownership-service", "/api/Disputes") },
        { "/api/Disputes", ("ownership-service", "/api/Disputes") },
        { "/api/report", ("report-service", "/api/Report") },
        { "/api/analytics", ("report-service", "/api/Analytics") },
        { "/api/history", ("report-service", "/api/History") },
        { "/api/ai", ("ai-service", "/api/ai") },
        { "/api/admin", ("admin-service", "/api/Admin") },
        { "/api/dashboard", ("admin-service", "/api/Dashboard") },
        { "/api/vnpay", ("vnpay-service", "/api/vnpay") }
    };

    public SimpleProxyMiddleware(RequestDelegate next, IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<SimpleProxyMiddleware> logger)
    {
        _next = next;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    private static void WriteCorsHeaders(HttpContext context)
    {
        var origin = context.Request.Headers["Origin"].ToString();
        if (!string.IsNullOrEmpty(origin))
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = origin;
            context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
        }
        else
        {
            // Allow all origins for development (without credentials)
            context.Response.Headers["Access-Control-Allow-Origin"] = "*";
            // Don't set Allow-Credentials when using wildcard
        }
        context.Response.Headers["Vary"] = "Origin";
        context.Response.Headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
        context.Response.Headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type,Accept";
    }

    private async Task<bool> ProxyRequestAsync(HttpContext context, string serviceName, string targetPath)
    {
        var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
        
        // Special handling for services that run on non-standard ports
        var port = serviceName switch
        {
            "ai-service" => ":8000",
            "vnpay-service" => ":3001",
            _ => ""
        };
        var targetUrl = $"http://{serviceName}{port}{targetPath}{queryString}";
        
        // Debug logging
        _logger.LogInformation("[Gateway] Proxying {Method} {Path} -> {TargetUrl}", context.Request.Method, context.Request.Path, targetUrl);

        var httpClient = _httpClientFactory.CreateClient("ProxyClient");
        var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

        // Copy headers (including Authorization)
        foreach (var header in context.Request.Headers)
        {
            // Skip headers that should not be forwarded
            if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase) ||
                header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            // Try to add to request headers first (for headers like Authorization)
            if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
            {
                // If it fails, try to add to content headers (for Content-Type, etc.)
                request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
        }

        // Explicitly ensure Authorization header is forwarded if present
        var authHeader = context.Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(authHeader) && !request.Headers.Contains("Authorization"))
        {
            request.Headers.Add("Authorization", authHeader);
        }

        // Copy body for methods that can have a body
        if (context.Request.Method != "GET" && context.Request.Method != "HEAD" && context.Request.ContentLength != 0)
        {
            context.Request.EnableBuffering();
            var body = new MemoryStream();
            await context.Request.Body.CopyToAsync(body);
            body.Position = 0;
            request.Content = new StreamContent(body);

            if (!string.IsNullOrWhiteSpace(context.Request.ContentType))
            {
                request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(context.Request.ContentType);
            }
        }

        try
        {
            var response = await httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                context.RequestAborted
            );

            context.Response.StatusCode = (int)response.StatusCode;
            
            // Log redirect responses for debugging
            if (response.StatusCode == System.Net.HttpStatusCode.Redirect || 
                response.StatusCode == System.Net.HttpStatusCode.MovedPermanently ||
                response.StatusCode == System.Net.HttpStatusCode.Found ||
                response.StatusCode == System.Net.HttpStatusCode.TemporaryRedirect)
            {
                _logger.LogInformation($"[Gateway] Received redirect response: {response.StatusCode}");
                if (response.Headers.Location != null)
                {
                    _logger.LogInformation($"[Gateway] Redirect Location: {response.Headers.Location}");
                }
            }

            // Add CORS headers FIRST (before copying other headers)
            WriteCorsHeaders(context);

            // Copy response headers (but skip CORS headers to avoid conflicts)
            foreach (var header in response.Headers)
            {
                if (header.Key.StartsWith("Access-Control-", StringComparison.OrdinalIgnoreCase))
                {
                    continue; // Skip CORS headers from backend, use our own
                }
                _logger.LogInformation($"[Gateway] Copying header: {header.Key} = {string.Join(", ", header.Value)}");
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }

            foreach (var header in response.Content.Headers)
            {
                if (header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                {
                    continue; // Let ASP.NET Core handle this
                }
                if (header.Key.StartsWith("Access-Control-", StringComparison.OrdinalIgnoreCase))
                {
                    continue; // Skip CORS headers from backend
                }
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }

            // Remove transfer-encoding as it will be set by Kestrel
            context.Response.Headers.Remove("transfer-encoding");
            context.Response.Headers.Remove("Transfer-Encoding");

            await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
            return true;
        }
        catch (Exception ex)
        {
            context.Response.StatusCode = 502;
            await context.Response.WriteAsync($"Gateway Error: {ex.Message}");
            return true;
        }
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value;

        Console.WriteLine($"[Gateway] MIDDLEWARE CALLED: {context.Request.Method} {path}");

        try
        {
            // _logger.LogInformation("[Gateway] Received request: {Method} {Path}", context.Request.Method, path);

            // Handle preflight OPTIONS requests
            if (string.Equals(context.Request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 204;
                WriteCorsHeaders(context);
                await context.Response.CompleteAsync();
                return;
            }

            if (string.IsNullOrEmpty(path))
            {
                Console.WriteLine("[Gateway] Empty path, calling next middleware");
                await _next(context);
                return;
            }

            // Find matching route
            // _logger.LogInformation("[Gateway] Incoming request: {Method} {Path}", context.Request.Method, path);
        foreach (var mapping in RouteMappings)
        {
            if (path.StartsWith(mapping.Key, StringComparison.OrdinalIgnoreCase))
            {
                var prefix = mapping.Key;
                var (serviceName, targetPrefix) = mapping.Value;
                Console.WriteLine($"[Gateway] Matched route: {prefix} -> {serviceName} with prefix {targetPrefix}");
                
                // Handle special cases for ownership service
                if (prefix == "/api/ownership")
                {
                    // Forward ownership-related requests
                    var remainder = path.Substring(prefix.Length);
                    if (string.IsNullOrEmpty(remainder) || remainder == "/")
                    {
                        remainder = "/";
                    }
                    // Map /api/ownership/coowners -> /api/CoOwners (case sensitive mapping)
                    if (remainder.StartsWith("/coowners", StringComparison.OrdinalIgnoreCase))
                    {
                        remainder = "/CoOwners" + remainder.Substring("/coowners".Length);
                    }
                    // Map /api/ownership/vehiclegroups -> /api/VehicleGroups
                    else if (remainder.StartsWith("/vehiclegroups", StringComparison.OrdinalIgnoreCase))
                    {
                        remainder = "/VehicleGroups" + remainder.Substring("/vehiclegroups".Length);
                    }
                    // Map /api/ownership/ownerships -> /api/Ownerships
                    else if (remainder.StartsWith("/ownerships", StringComparison.OrdinalIgnoreCase))
                    {
                        remainder = "/Ownerships" + remainder.Substring("/ownerships".Length);
                    }
                    // Map /api/ownership/econtracts -> /api/EContracts
                    else if (remainder.StartsWith("/econtracts", StringComparison.OrdinalIgnoreCase))
                    {
                        remainder = "/EContracts" + remainder.Substring("/econtracts".Length);
                    }
                    // Map /api/voting -> /api/Voting
                    else if (remainder.StartsWith("/voting", StringComparison.OrdinalIgnoreCase))
                    {
                        remainder = "/Voting" + remainder.Substring("/voting".Length);
                    }
                    // Map /api/groupfunds -> /api/GroupFunds
                    else if (remainder.StartsWith("/groupfunds", StringComparison.OrdinalIgnoreCase))
                    {
                        remainder = "/GroupFunds" + remainder.Substring("/groupfunds".Length);
                    }
                    
                    var targetPath = targetPrefix + remainder;
                    if (await ProxyRequestAsync(context, serviceName, targetPath))
                        return;
                }
                else if (prefix == "/api/coowners" || prefix == "/api/CoOwners" || prefix == "/api/vehicles" || prefix == "/api/econtract" ||
                         prefix == "/api/VehicleGroups" || prefix == "/api/Ownerships" || prefix == "/api/EContracts" || prefix == "/api/GroupFunds" ||
                         prefix == "/api/Voting")
                {
                    // Direct mapping for ownership service endpoints
                    var remainder = path.Substring(prefix.Length);
                    if (string.IsNullOrEmpty(remainder))
                        remainder = "";
                    var targetPath = targetPrefix + remainder;
                    if (await ProxyRequestAsync(context, serviceName, targetPath))
                        return;
                }
                else if (prefix == "/api/groups" || prefix == "/api/voting" || prefix == "/api/fund")
                {
                    // Group management endpoints
                    var remainder = path.Substring(prefix.Length);
                    if (string.IsNullOrEmpty(remainder))
                        remainder = "";
                    var targetPath = targetPrefix + remainder;
                    if (await ProxyRequestAsync(context, serviceName, targetPath))
                        return;
                }
                else if (prefix == "/api/payment")
                {
                    // Payment service routing - handle costshares, transactions, payments, and other sub-routes
                    var remainder = path.Substring(prefix.Length);
                    if (remainder.StartsWith("/costshares", StringComparison.OrdinalIgnoreCase))
                    {
                        // Map /api/payment/costshares -> /api/CostShares
                        var costSharesPath = remainder.Substring("/costshares".Length);
                        var targetPath = "/api/CostShares" + costSharesPath;
                        if (await ProxyRequestAsync(context, "payment-service", targetPath))
                            return;
                    }
                    else if (remainder.StartsWith("/transactions", StringComparison.OrdinalIgnoreCase))
                    {
                        // Map /api/payment/transactions -> /api/Transactions
                        var transactionsPath = remainder.Substring("/transactions".Length);
                        var targetPath = "/api/Transactions" + transactionsPath;
                        if (await ProxyRequestAsync(context, "payment-service", targetPath))
                            return;
                    }
                    else if (remainder.StartsWith("/payments", StringComparison.OrdinalIgnoreCase))
                    {
                        // Map /api/payment/payments -> /api/Payments
                        var paymentsPath = remainder.Substring("/payments".Length);
                        var targetPath = "/api/Payments" + paymentsPath;
                        if (await ProxyRequestAsync(context, "payment-service", targetPath))
                            return;
                    }
                    else if (remainder.StartsWith("/companypaymentrequests", StringComparison.OrdinalIgnoreCase))
                    {
                        // Map /api/payment/companypaymentrequests -> /api/CompanyPaymentRequests
                        var companyPaymentRequestsPath = remainder.Substring("/companypaymentrequests".Length);
                        var targetPath = "/api/CompanyPaymentRequests" + companyPaymentRequestsPath;
                        if (await ProxyRequestAsync(context, "payment-service", targetPath))
                            return;
                    }
                    else
                    {
                        // Standard payment routing
                        var targetPath = targetPrefix + remainder;
                        if (await ProxyRequestAsync(context, serviceName, targetPath))
                            return;
                    }
                }
                else
                {
                    // Standard routing
                    var remainder = path.Substring(prefix.Length);
                    var targetPath = targetPrefix + remainder;
                    if (await ProxyRequestAsync(context, serviceName, targetPath))
                        return;
                }
            }
        }

        // Legacy route support for backward compatibility
        if (path.StartsWith("/api/account", StringComparison.OrdinalIgnoreCase))
        {
            var remainder = path.Substring("/api/account".Length);
            if (remainder.StartsWith("/Account", StringComparison.OrdinalIgnoreCase))
            {
                remainder = remainder.Substring("/Account".Length);
            }
            if (string.IsNullOrEmpty(remainder)) remainder = "/";
            var targetPath = "/api" + remainder;
            if (await ProxyRequestAsync(context, "ownership-service", targetPath))
                return;
        }

        if (path.StartsWith("/api/group", StringComparison.OrdinalIgnoreCase))
        {
            var remainder = path.Substring("/api/group".Length);
            if (remainder.StartsWith("/Group", StringComparison.OrdinalIgnoreCase))
            {
                remainder = remainder.Substring("/Group".Length);
            }
            if (string.IsNullOrEmpty(remainder)) remainder = "/";
            var targetPath = "/api/Group" + remainder;
            if (await ProxyRequestAsync(context, "ownership-service", targetPath))
                return;
        }

        // No matching route found, continue to next middleware
        await _next(context);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Gateway] ERROR in InvokeAsync: {ex.Message}");
            await _next(context);
        }
    }
}
