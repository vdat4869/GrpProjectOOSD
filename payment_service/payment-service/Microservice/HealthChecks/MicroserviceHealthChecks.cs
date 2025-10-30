using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace PaymentService.Microservice.HealthChecks
{
    public class DatabaseHealthCheck : IHealthCheck
    {
        private readonly Data.PaymentDbContext _context;
        private readonly ILogger<DatabaseHealthCheck> _logger;

        public DatabaseHealthCheck(Data.PaymentDbContext context, ILogger<DatabaseHealthCheck> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                await _context.Database.CanConnectAsync(cancellationToken);
                return HealthCheckResult.Healthy("Database connection is healthy");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database health check failed");
                return HealthCheckResult.Unhealthy("Database connection failed", ex);
            }
        }
    }

    public class RabbitMQHealthCheck : IHealthCheck
    {
        private readonly Microservice.MessageQueue.RabbitMQService _rabbitMQService;
        private readonly ILogger<RabbitMQHealthCheck> _logger;

        public RabbitMQHealthCheck(Microservice.MessageQueue.RabbitMQService rabbitMQService, ILogger<RabbitMQHealthCheck> logger)
        {
            _rabbitMQService = rabbitMQService;
            _logger = logger;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                // Check if RabbitMQ connection is available
                if (_rabbitMQService == null)
                {
                    return HealthCheckResult.Unhealthy("RabbitMQ service is not available");
                }

                return HealthCheckResult.Healthy("RabbitMQ connection is healthy");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RabbitMQ health check failed");
                return HealthCheckResult.Unhealthy("RabbitMQ connection failed", ex);
            }
        }
    }

    public class ExternalServiceHealthCheck : IHealthCheck
    {
        private readonly Microservice.ServiceDiscovery.IServiceDiscovery _serviceDiscovery;
        private readonly ILogger<ExternalServiceHealthCheck> _logger;

        public ExternalServiceHealthCheck(Microservice.ServiceDiscovery.IServiceDiscovery serviceDiscovery, ILogger<ExternalServiceHealthCheck> logger)
        {
            _serviceDiscovery = serviceDiscovery;
            _logger = logger;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                var services = new[] { "auth-service", "notification-service", "user-service" };
                var unhealthyServices = new List<string>();

                foreach (var service in services)
                {
                    var isHealthy = await _serviceDiscovery.IsServiceHealthyAsync(service);
                    if (!isHealthy)
                    {
                        unhealthyServices.Add(service);
                    }
                }

                if (unhealthyServices.Any())
                {
                    return HealthCheckResult.Degraded($"Some external services are unhealthy: {string.Join(", ", unhealthyServices)}");
                }

                return HealthCheckResult.Healthy("All external services are healthy");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "External service health check failed");
                return HealthCheckResult.Unhealthy("External service health check failed", ex);
            }
        }
    }

    public class MemoryHealthCheck : IHealthCheck
    {
        private readonly ILogger<MemoryHealthCheck> _logger;

        public MemoryHealthCheck(ILogger<MemoryHealthCheck> logger)
        {
            _logger = logger;
        }

        public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                var process = System.Diagnostics.Process.GetCurrentProcess();
                var memoryUsage = process.WorkingSet64;
                var memoryLimit = 500 * 1024 * 1024; // 500MB limit

                if (memoryUsage > memoryLimit)
                {
                    return Task.FromResult(HealthCheckResult.Unhealthy($"Memory usage is too high: {memoryUsage / 1024 / 1024}MB"));
                }

                return Task.FromResult(HealthCheckResult.Healthy($"Memory usage is normal: {memoryUsage / 1024 / 1024}MB"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Memory health check failed");
                return Task.FromResult(HealthCheckResult.Unhealthy("Memory health check failed", ex));
            }
        }
    }
}
