using Consul;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PaymentService.Microservice.ServiceDiscovery
{
    public class ConsulServiceDiscoveryClient : IServiceDiscovery
    {
        private readonly IConsulClient _consulClient;
        private readonly ILogger<ConsulServiceDiscoveryClient> _logger;

        public ConsulServiceDiscoveryClient(IConsulClient consulClient, ILogger<ConsulServiceDiscoveryClient> logger)
        {
            _consulClient = consulClient;
            _logger = logger;
        }

        public async Task<string> GetServiceUrlAsync(string serviceName)
        {
            var instances = await GetServiceInstancesAsync(serviceName);
            var healthyInstance = instances.FirstOrDefault(i => i.IsHealthy);
            
            if (healthyInstance == null)
            {
                throw new InvalidOperationException($"No healthy instances found for service: {serviceName}");
            }

            return $"http://{healthyInstance.Address}:{healthyInstance.Port}";
        }

        public async Task<List<ServiceInstance>> GetServiceInstancesAsync(string serviceName)
        {
            try
            {
                var services = await _consulClient.Health.Service(serviceName, "", true);
                var instances = new List<ServiceInstance>();

                foreach (var service in services.Response)
                {
                    var instance = new ServiceInstance
                    {
                        Id = service.Service.ID,
                        Name = service.Service.Service,
                        Address = service.Service.Address,
                        Port = service.Service.Port,
                        Tags = service.Service.Tags,
                        IsHealthy = service.Checks.All(c => c.Status == HealthStatus.Passing)
                    };
                    instances.Add(instance);
                }

                return instances;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting service instances for {serviceName}");
                return new List<ServiceInstance>();
            }
        }

        public async Task<bool> IsServiceHealthyAsync(string serviceName)
        {
            var instances = await GetServiceInstancesAsync(serviceName);
            return instances.Any(i => i.IsHealthy);
        }
    }
}
