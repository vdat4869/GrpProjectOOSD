using GroupManagementService.Models;

namespace GroupManagementService.Repositories
{
    public interface IFundRepository
    {
        Task<Fund?> GetByIdAsync(int id);
        Task<Fund> CreateAsync(Fund fund);
        Task<IEnumerable<Fund>> GetByGroupIdAsync(int groupId);
        Task AddTransactionAsync(FundTransaction txn);
        Task SaveChangesAsync();
    }
}


