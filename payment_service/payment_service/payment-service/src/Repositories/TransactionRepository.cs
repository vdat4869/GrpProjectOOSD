using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.Models;
using PaymentService.Repositories.Interfaces;

namespace PaymentService.Repositories
{
    public class TransactionRepository : Repository<Transaction>, ITransactionRepository
    {
        public TransactionRepository(PaymentDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Transaction>> GetByWalletIdAsync(Guid walletId, int page = 1, int pageSize = 20)
        {
            return await _dbSet
                .Where(t => t.WalletId == walletId)
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Transaction>> GetByUserIdAsync(Guid userId, int page = 1, int pageSize = 20)
        {
            // Wallet removed: filter by userId via related CostShareDetail in payments is not applicable here
            return await _dbSet
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Transaction>> GetByTypeAsync(TransactionType type, int page = 1, int pageSize = 20)
        {
            return await _dbSet
                .Where(t => t.Type == type)
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<decimal> GetTotalByWalletIdAsync(Guid walletId, TransactionType? type = null)
        {
            var query = _dbSet.Where(t => t.WalletId == walletId);
            
            if (type.HasValue)
            {
                query = query.Where(t => t.Type == type.Value);
            }

            return await query.SumAsync(t => t.Amount);
        }

        public async Task<bool> CreateTransactionAsync(Guid walletId, TransactionType type, decimal amount, string? description = null)
        {
            var transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                WalletId = walletId,
                Type = type,
                Amount = amount,
                Description = description,
                CreatedAt = DateTime.UtcNow
            };

            await AddAsync(transaction);
            return true;
        }
    }
}
