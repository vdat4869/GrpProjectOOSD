using PaymentService.Models;

namespace PaymentService.Repositories.Interfaces
{
    public interface ICostShareRepository : IRepository<CostShare>
    {
        Task<IEnumerable<CostShare>> GetByGroupIdAsync(Guid groupId, int page = 1, int pageSize = 20);
        Task<IEnumerable<CostShare>> GetByVehicleIdAsync(Guid vehicleId, int page = 1, int pageSize = 20);
        Task<IEnumerable<CostShare>> GetByStatusAsync(CostShareStatus status, int page = 1, int pageSize = 20);
        Task<CostShare?> GetWithDetailsAsync(Guid id);
        Task<bool> MarkAsPaidAsync(Guid costShareDetailId);
    }
}
