using GroupManagementService.Models;

namespace GroupManagementService.Repositories
{
    public interface IVoteRepository
    {
        Task<Vote?> GetByIdAsync(int id);
        Task<Vote> AddAsync(Vote vote);
        Task SaveChangesAsync();
    }
}
