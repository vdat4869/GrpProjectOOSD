using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace PaymentService.Microservice.Security
{
    public class RateLimitingService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<RateLimitingService> _logger;
        private readonly ConcurrentDictionary<string, SemaphoreSlim> _semaphores = new();

        public RateLimitingService(IMemoryCache cache, ILogger<RateLimitingService> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        public async Task<bool> IsAllowedAsync(string key, int limit, TimeSpan window)
        {
            var cacheKey = $"rate_limit_{key}";
            var current = _cache.GetOrCreate(cacheKey, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = window;
                return new RateLimitInfo { Count = 0, WindowStart = DateTime.UtcNow };
            });

            if (current == null)
            {
                return false;
            }

            // Reset counter if window has expired
            if (DateTime.UtcNow - current.WindowStart > window)
            {
                current.Count = 0;
                current.WindowStart = DateTime.UtcNow;
            }

            if (current.Count >= limit)
            {
                _logger.LogWarning("Rate limit exceeded for key: {Key}, limit: {Limit}, current: {Current}", 
                    key, limit, current.Count);
                return false;
            }

            current.Count++;
            _cache.Set(cacheKey, current, window);

            return true;
        }

        public async Task<bool> IsAllowedPerUserAsync(string userId, string endpoint, int limit, TimeSpan window)
        {
            var key = $"{userId}_{endpoint}";
            return await IsAllowedAsync(key, limit, window);
        }

        public async Task<bool> IsAllowedPerIpAsync(string ipAddress, int limit, TimeSpan window)
        {
            var key = $"ip_{ipAddress}";
            return await IsAllowedAsync(key, limit, window);
        }

        public async Task<bool> IsAllowedGlobalAsync(int limit, TimeSpan window)
        {
            var key = "global";
            return await IsAllowedAsync(key, limit, window);
        }

        private class RateLimitInfo
        {
            public int Count { get; set; }
            public DateTime WindowStart { get; set; }
        }
    }
}
