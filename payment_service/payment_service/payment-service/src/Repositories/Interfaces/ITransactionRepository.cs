using PaymentService.Models;

namespace PaymentService.Repositories.Interfaces
{
    public interface ITransactionRepository : IRepository<Transaction>
    {
        Task<IEnumerable<Transaction>> GetByWalletIdAsync(Guid walletId, int page = 1, int pageSize = 20);
        Task<IEnumerable<Transaction>> GetByUserIdAsync(Guid userId, int page = 1, int pageSize = 20);
        Task<IEnumerable<Transaction>> GetByTypeAsync(TransactionType type, int page = 1, int pageSize = 20);
        Task<decimal> GetTotalByWalletIdAsync(Guid walletId, TransactionType? type = null);
        Task<bool> CreateTransactionAsync(Guid walletId, TransactionType type, decimal amount, string? description = null);
    }
}
