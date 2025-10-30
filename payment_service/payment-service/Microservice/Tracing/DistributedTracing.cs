using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace PaymentService.Microservice.Tracing
{
    public class DistributedTracingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<DistributedTracingMiddleware> _logger;

        public DistributedTracingMiddleware(RequestDelegate next, ILogger<DistributedTracingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var traceId = GetOrCreateTraceId(context);
            var spanId = Activity.Current?.Id ?? Guid.NewGuid().ToString();

            using var activity = ActivitySource.StartActivity("HTTP Request");
            activity?.SetTag("http.method", context.Request.Method);
            activity?.SetTag("http.url", context.Request.Path);
            activity?.SetTag("http.user_agent", context.Request.Headers.UserAgent.ToString());
            activity?.SetTag("trace.id", traceId);
            activity?.SetTag("span.id", spanId);

            context.Response.Headers.Add("X-Trace-Id", traceId);
            context.Response.Headers.Add("X-Span-Id", spanId);

            try
            {
                await _next(context);
                activity?.SetTag("http.status_code", context.Response.StatusCode.ToString());
            }
            catch (Exception ex)
            {
                activity?.SetTag("error", true);
                activity?.SetTag("error.message", ex.Message);
                _logger.LogError(ex, "Request processing failed");
                throw;
            }
        }

        private string GetOrCreateTraceId(HttpContext context)
        {
            var traceId = context.Request.Headers["X-Trace-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(traceId))
            {
                traceId = Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString();
            }
            return traceId;
        }
    }

    public static class ActivitySource
    {
        public static readonly System.Diagnostics.ActivitySource Instance = new("PaymentService");
    }

    public class TracingService
    {
        private readonly ILogger<TracingService> _logger;

        public TracingService(ILogger<TracingService> logger)
        {
            _logger = logger;
        }

        public void StartSpan(string operationName, string? parentTraceId = null)
        {
            using var activity = ActivitySource.Instance.StartActivity(operationName);
            if (activity != null)
            {
                activity.SetTag("service.name", "payment-service");
                activity.SetTag("service.version", "1.0.0");
                activity.SetTag("operation.name", operationName);
                
                if (!string.IsNullOrEmpty(parentTraceId))
                {
                    activity.SetTag("parent.trace.id", parentTraceId);
                }
            }
        }

        public void AddEvent(string eventName, string? description = null)
        {
            Activity.Current?.AddEvent(new ActivityEvent(eventName, DateTimeOffset.UtcNow, new ActivityTagsCollection
            {
                ["description"] = description ?? string.Empty
            }));
        }

        public void AddTag(string key, string value)
        {
            Activity.Current?.SetTag(key, value);
        }

        public void RecordException(Exception exception)
        {
            Activity.Current?.RecordException(exception);
            _logger.LogError(exception, "Exception recorded in trace");
        }
    }
}
