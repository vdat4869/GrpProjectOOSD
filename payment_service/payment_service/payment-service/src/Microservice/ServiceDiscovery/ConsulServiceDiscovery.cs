using Consul;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace PaymentService.Microservice.ServiceDiscovery
{
    public class ConsulServiceDiscovery : IHostedService
    {
        private readonly IConsulClient _consulClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ConsulServiceDiscovery> _logger;
        private readonly string _serviceId;
        private readonly string _serviceName;
        private readonly string _serviceAddress;
        private readonly int _servicePort;

        public ConsulServiceDiscovery(
            IConsulClient consulClient,
            IConfiguration configuration,
            ILogger<ConsulServiceDiscovery> logger)
        {
            _consulClient = consulClient;
            _configuration = configuration;
            _logger = logger;
            _serviceName = _configuration["ServiceDiscovery:ServiceName"] ?? "payment-service";
            _serviceAddress = _configuration["ServiceDiscovery:ServiceAddress"] ?? "localhost";
            _servicePort = int.Parse(_configuration["ServiceDiscovery:ServicePort"] ?? "5003");
            _serviceId = $"{_serviceName}-{Environment.MachineName}-{_servicePort}";
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            var registration = new AgentServiceRegistration
            {
                ID = _serviceId,
                Name = _serviceName,
                Address = _serviceAddress,
                Port = _servicePort,
                Tags = new[] { "payment", "microservice", "api" },
                Check = new AgentServiceCheck
                {
                    HTTP = $"http://{_serviceAddress}:{_servicePort}/api/health",
                    Interval = TimeSpan.FromSeconds(10),
                    Timeout = TimeSpan.FromSeconds(5),
                    DeregisterCriticalServiceAfter = TimeSpan.FromMinutes(1)
                }
            };

            await _consulClient.Agent.ServiceRegister(registration, cancellationToken);
            _logger.LogInformation($"Service {_serviceName} registered with Consul");
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            await _consulClient.Agent.ServiceDeregister(_serviceId, cancellationToken);
            _logger.LogInformation($"Service {_serviceName} deregistered from Consul");
        }
    }
}
