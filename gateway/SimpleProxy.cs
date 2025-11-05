using Microsoft.AspNetCore.Http;
using System.Net.Http;
using System.Net.Http.Headers;

public class SimpleProxyMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public SimpleProxyMiddleware(RequestDelegate next, HttpClient httpClient, IConfiguration configuration)
        {
            _next = next;
            _httpClient = httpClient;
            _configuration = configuration;
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

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value;

            // Handle preflight
            if (string.Equals(context.Request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 204;
                WriteCorsHeaders(context);
                await context.Response.CompleteAsync();
                return;
            }
            
            if (path != null && path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/auth";
                var targetPath = "/api/Auth" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://auth-service{targetPath}{queryString}";
                
                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);
                
                // Copy headers
                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) || 
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue; // Skip these headers, they'll be set by the content
                    }
                    
                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }
                
                // Copy body for methods that can have a body
                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
                {
                    context.Request.EnableBuffering();
                    var body = new MemoryStream();
                    await context.Request.Body.CopyToAsync(body);
                    body.Position = 0;
                    request.Content = new StreamContent(body);

                    // Set content type from the incoming request if provided
                    if (!string.IsNullOrWhiteSpace(context.Request.ContentType))
                    {
                        request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(context.Request.ContentType);
                    }
                }
                
                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );
                
                context.Response.StatusCode = (int)response.StatusCode;
                
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }

                // Add CORS headers
                WriteCorsHeaders(context);

                // Kestrel will set the content-length/transfer-encoding as appropriate
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");

                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/booking", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/booking";
                var targetPath = "/api/Booking" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://booking-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/account", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/account";
                var remainder = path.Substring(prefix.Length);
                if (remainder.StartsWith("/Account", StringComparison.OrdinalIgnoreCase))
                {
                    remainder = remainder.Substring("/Account".Length);
                }
                if (string.IsNullOrEmpty(remainder)) remainder = "/";
                var targetPath = "/api" + remainder; // forward directly to /api/* controllers (CoOwners, EContracts, Ownerships)
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://account-ownership-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");

                // Add CORS headers
                WriteCorsHeaders(context);

                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/group", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/group";
                var remainder = path.Substring(prefix.Length);
                if (remainder.StartsWith("/Group", StringComparison.OrdinalIgnoreCase))
                {
                    remainder = remainder.Substring("/Group".Length);
                }
                if (string.IsNullOrEmpty(remainder)) remainder = "/";
                var targetPath = "/api/Group" + remainder;
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://group-management-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/history", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/history";
                var targetPath = "/api/History" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://history-analytics-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/analytics", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/analytics";
                var targetPath = "/api/Analytics" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://history-analytics-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/econtract", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/econtract";
                var targetPath = "/api/EContract" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://account-ownership-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/voting", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/voting";
                var targetPath = "/api/Voting" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://group-management-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/shared-fund", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/shared-fund";
                var targetPath = "/api/SharedFund" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://payment-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/payment", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/payment";
                var targetPath = "/api/Payment" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://payment-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/kyc", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/kyc";
                var targetPath = "/api/Kyc" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://auth-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/role", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/role";
                var targetPath = "/api/Role" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://auth-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/admin", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/admin";
                var targetPath = "/api/Admin" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://admin-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }

            if (path != null && path.StartsWith("/api/dashboard", StringComparison.OrdinalIgnoreCase))
            {
                var prefix = "/api/dashboard";
                var targetPath = "/api/Dashboard" + path.Substring(prefix.Length);
                var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                var targetUrl = $"http://admin-service{targetPath}{queryString}";

                var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), targetUrl);

                foreach (var header in context.Request.Headers)
                {
                    if (header.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase) ||
                        header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }

                if (context.Request.Method != "GET" && context.Request.ContentLength >= 0)
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

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    context.RequestAborted
                );

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                foreach (var header in response.Content.Headers)
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                context.Response.Headers.Remove("Transfer-Encoding");
                // Add CORS headers
                WriteCorsHeaders(context);
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                return;
            }
            
            await _next(context);
        }
    }
