using GroupManagementService.Models;

namespace GroupManagementService.Repositories
{
    public interface IGroupRepository
    {
        Task<IEnumerable<Group>> GetAllAsync();
        Task<Group?> GetByIdAsync(int id);
        Task<Group> AddAsync(Group group);
        Task SaveChangesAsync();
    }
}
