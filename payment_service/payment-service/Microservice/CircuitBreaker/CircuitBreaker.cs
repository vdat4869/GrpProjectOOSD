using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace PaymentService.Microservice.CircuitBreaker
{
    public class CircuitBreaker
    {
        private readonly ILogger<CircuitBreaker> _logger;
        private readonly int _failureThreshold;
        private readonly TimeSpan _timeout;
        private readonly TimeSpan _retryTimeout;

        private int _failureCount = 0;
        private DateTime _lastFailureTime = DateTime.MinValue;
        private CircuitState _state = CircuitState.Closed;

        public CircuitBreaker(
            ILogger<CircuitBreaker> logger,
            int failureThreshold = 5,
            TimeSpan timeout = default,
            TimeSpan retryTimeout = default)
        {
            _logger = logger;
            _failureThreshold = failureThreshold;
            _timeout = timeout == default ? TimeSpan.FromSeconds(30) : timeout;
            _retryTimeout = retryTimeout == default ? TimeSpan.FromMinutes(1) : retryTimeout;
        }

        public async Task<T> ExecuteAsync<T>(Func<Task<T>> operation, Func<Task<T>> fallback = null)
        {
            if (_state == CircuitState.Open)
            {
                if (DateTime.UtcNow - _lastFailureTime > _retryTimeout)
                {
                    _state = CircuitState.HalfOpen;
                    _logger.LogInformation("Circuit breaker moved to Half-Open state");
                }
                else
                {
                    _logger.LogWarning("Circuit breaker is Open, executing fallback");
                    return fallback != null ? await fallback() : throw new CircuitBreakerOpenException();
                }
            }

            try
            {
                using var cts = new CancellationTokenSource(_timeout);
                var result = await operation();
                
                if (_state == CircuitState.HalfOpen)
                {
                    _state = CircuitState.Closed;
                    _failureCount = 0;
                    _logger.LogInformation("Circuit breaker moved to Closed state");
                }

                return result;
            }
            catch (Exception ex)
            {
                _failureCount++;
                _lastFailureTime = DateTime.UtcNow;

                if (_failureCount >= _failureThreshold)
                {
                    _state = CircuitState.Open;
                    _logger.LogError(ex, $"Circuit breaker moved to Open state after {_failureCount} failures");
                }

                if (fallback != null)
                {
                    _logger.LogWarning("Executing fallback due to operation failure");
                    return await fallback();
                }

                throw;
            }
        }

        public async Task ExecuteAsync(Func<Task> operation, Func<Task> fallback = null)
        {
            await ExecuteAsync(async () =>
            {
                await operation();
                return true;
            }, fallback != null ? async () =>
            {
                await fallback();
                return true;
            } : null);
        }
    }

    public enum CircuitState
    {
        Closed,
        Open,
        HalfOpen
    }

    public class CircuitBreakerOpenException : Exception
    {
        public CircuitBreakerOpenException() : base("Circuit breaker is in Open state")
        {
        }
    }
}
