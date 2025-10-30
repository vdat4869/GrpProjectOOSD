using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.Text.Json;

namespace PaymentService.Microservice.Security
{
    public class SecurityMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<SecurityMiddleware> _logger;

        public SecurityMiddleware(RequestDelegate next, ILogger<SecurityMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Add security headers
            context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Add("X-Frame-Options", "DENY");
            context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
            context.Response.Headers.Add("Referrer-Policy", "strict-origin-when-cross-origin");
            context.Response.Headers.Add("Content-Security-Policy", 
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; " +
                "font-src 'self' data:; " +
                "connect-src 'self' https://sandbox.vnpayment.vn https://vnpayment.vn; " +
                "frame-src 'self';");

            // Log security events
            await LogSecurityEvent(context);

            // Validate request size
            if (context.Request.ContentLength > 10 * 1024 * 1024) // 10MB limit
            {
                context.Response.StatusCode = 413;
                await context.Response.WriteAsync("Request entity too large");
                return;
            }

            await _next(context);
        }

        private async Task LogSecurityEvent(HttpContext context)
        {
            var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            var ipAddress = GetClientIpAddress(context);
            var userAgent = context.Request.Headers.UserAgent.ToString();
            var requestPath = context.Request.Path;

            var securityEvent = new
            {
                Timestamp = DateTime.UtcNow,
                UserId = userId,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                RequestPath = requestPath,
                Method = context.Request.Method,
                StatusCode = context.Response.StatusCode
            };

            _logger.LogInformation("Security Event: {SecurityEvent}", JsonSerializer.Serialize(securityEvent));
        }

        private string GetClientIpAddress(HttpContext context)
        {
            var xForwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(xForwardedFor))
            {
                return xForwardedFor.Split(',')[0].Trim();
            }

            var xRealIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
            if (!string.IsNullOrEmpty(xRealIp))
            {
                return xRealIp;
            }

            return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }
}
