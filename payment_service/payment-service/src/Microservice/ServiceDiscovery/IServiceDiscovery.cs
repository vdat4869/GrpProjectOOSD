using System.Collections.Generic;
using System.Threading.Tasks;

namespace PaymentService.Microservice.ServiceDiscovery
{
    public interface IServiceDiscovery
    {
        Task<string> GetServiceUrlAsync(string serviceName);
        Task<List<ServiceInstance>> GetServiceInstancesAsync(string serviceName);
        Task<bool> IsServiceHealthyAsync(string serviceName);
    }

    public class ServiceInstance
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int Port { get; set; }
        public string[] Tags { get; set; } = Array.Empty<string>();
        public bool IsHealthy { get; set; }
    }
}
