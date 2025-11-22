using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace PaymentService.Microservice.Configuration
{
    public class ConfigurationService : IHostedService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ConfigurationService> _logger;
        private readonly Dictionary<string, string> _configCache = new();

        public ConfigurationService(IConfiguration configuration, ILogger<ConfigurationService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            await LoadConfigurationAsync();
            _logger.LogInformation("Configuration service started");
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Configuration service stopped");
            return Task.CompletedTask;
        }

        public T GetConfiguration<T>(string key, T defaultValue = default)
        {
            try
            {
                var value = _configuration[key];
                if (string.IsNullOrEmpty(value))
                {
                    return defaultValue;
                }

                return (T)Convert.ChangeType(value, typeof(T));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Failed to get configuration for key: {key}, using default value");
                return defaultValue;
            }
        }

        public string GetConnectionString(string name)
        {
            return _configuration.GetConnectionString(name) ?? string.Empty;
        }

        public bool IsFeatureEnabled(string featureName)
        {
            return GetConfiguration($"Features:{featureName}", false);
        }

        public int GetRateLimit(string endpoint)
        {
            return GetConfiguration($"RateLimiting:{endpoint}", 1000);
        }

        public TimeSpan GetTimeout(string serviceName)
        {
            var timeoutSeconds = GetConfiguration($"Timeouts:{serviceName}", 30);
            return TimeSpan.FromSeconds(timeoutSeconds);
        }

        private async Task LoadConfigurationAsync()
        {
            try
            {
                // Load configuration from various sources
                var configSources = new[]
                {
                    "appsettings.json",
                    "appsettings.Development.json",
                    "appsettings.Production.json"
                };

                foreach (var source in configSources)
                {
                    if (System.IO.File.Exists(source))
                    {
                        _logger.LogInformation($"Loading configuration from {source}");
                    }
                }

                // Cache frequently accessed configurations
                _configCache["ServiceName"] = GetConfiguration("ServiceDiscovery:ServiceName", "payment-service");
                _configCache["ServicePort"] = GetConfiguration("ServiceDiscovery:ServicePort", "5003");
                _configCache["DatabaseConnection"] = GetConnectionString("DefaultConnection");
                _configCache["RabbitMQHost"] = GetConfiguration("RabbitMQ:HostName", "localhost");

                _logger.LogInformation("Configuration loaded successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load configuration");
                throw;
            }
        }

        public void RefreshConfiguration()
        {
            _configCache.Clear();
            LoadConfigurationAsync().Wait();
        }
    }
}
