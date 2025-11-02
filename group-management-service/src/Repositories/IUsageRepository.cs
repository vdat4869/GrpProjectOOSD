using GroupManagementService.Models;

namespace GroupManagementService.Repositories
{
    public interface IUsageRepository
    {
        Task AddAsync(VehicleUsage usage);
        Task<IEnumerable<VehicleUsage>> GetByGroupAsync(int groupId);
        Task SaveChangesAsync();
    }
}
