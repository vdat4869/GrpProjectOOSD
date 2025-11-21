using Microsoft.AspNetCore.Http;
using System.Net.Http;
using System.Net.Http.Headers;

public class SimpleProxyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly HttpClient _httpClient;
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
        { "/api/report", ("report-service", "/api/Report") },
        { "/api/analytics", ("report-service", "/api/Analytics") },
        { "/api/history", ("report-service", "/api/History") },
        { "/api/ai", ("ai-service", "/api/ai") },
        { "/api/admin", ("admin-service", "/api/Admin") },
        { "/api/dashboard", ("admin-service", "/api/Dashboard") }
    };

    public SimpleProxyMiddleware(RequestDelegate next, HttpClient httpClient, IConfiguration configuration, ILogger<SimpleProxyMiddleware> logger)
    {
        _next = next;
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    private static void WriteCorsHeaders(HttpContext context)
    {
        var origin = context.Request.Headers["Origin"].ToString();
        if (!string.IsNullOrEmpty(origin))
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = origin;
        }
        else
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = "*";
        }
        context.Response.Headers["Vary"] = "Origin";
        context.Response.Headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
        context.Response.Headers["Access-Control-Allow-Headers"] = "Authorization,Content-Type";
    }

    private async Task<bool> ProxyRequestAsync(HttpContext context, string serviceName, string targetPath)
    {
        var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
        var targetUrl = $"http://{serviceName}{targetPath}{queryString}";
        
        // Debug logging
        _logger.LogInformation("[Gateway] Proxying {Method} {Path} -> {TargetUrl}", context.Request.Method, context.Request.Path, targetUrl);

        var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

        // Copy headers
        foreach (var header in context.Request.Headers)
        {
            if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase) ||
                header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
            {
                request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
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
            var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                context.RequestAborted
            );

            context.Response.StatusCode = (int)response.StatusCode;

            // Copy response headers
            foreach (var header in response.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }

            foreach (var header in response.Content.Headers)
            {
                if (header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                {
                    continue; // Let ASP.NET Core handle this
                }
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }

            // Remove transfer-encoding as it will be set by Kestrel
            context.Response.Headers.Remove("transfer-encoding");
            context.Response.Headers.Remove("Transfer-Encoding");

            // Add CORS headers
            WriteCorsHeaders(context);

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
                    // Payment service routing - handle costshares and other sub-routes
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
