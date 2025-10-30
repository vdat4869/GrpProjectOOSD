using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.Models;
using PaymentService.Repositories.Interfaces;

namespace PaymentService.Repositories
{
    public class PaymentRepository : Repository<Payment>, IPaymentRepository
    {
        public PaymentRepository(PaymentDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Payment>> GetByUserIdAsync(Guid userId, int page = 1, int pageSize = 20)
        {
            // Wallet removed: derive by user via CostShareDetail
            return await _dbSet
                .Where(p => p.CostShareDetail.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Payment>> GetByWalletIdAsync(Guid walletId, int page = 1, int pageSize = 20)
        {
            // Wallet removed: fall back to empty set
            return await Task.FromResult(Enumerable.Empty<Payment>());
        }

        public async Task<IEnumerable<Payment>> GetByStatusAsync(PaymentStatus status, int page = 1, int pageSize = 20)
        {
            return await _dbSet
                .Where(p => p.Status == status)
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<Payment?> GetByTransactionIdAsync(string transactionId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(p => p.TransactionId == transactionId);
        }

        public async Task<bool> UpdateStatusAsync(Guid paymentId, PaymentStatus status, string? errorMessage = null)
        {
            var payment = await GetByIdAsync(paymentId);
            if (payment == null) return false;

            payment.Status = status;
            if (!string.IsNullOrEmpty(errorMessage))
            {
                payment.ErrorMessage = errorMessage;
            }

            if (status == PaymentStatus.Completed)
            {
                payment.ProcessedAt = DateTime.UtcNow;
            }

            await UpdateAsync(payment);
            return true;
        }

        public async Task<bool> UpdateExternalTransactionIdAsync(Guid paymentId, string externalTransactionId)
        {
            var payment = await GetByIdAsync(paymentId);
            if (payment == null) return false;

            payment.ExternalTransactionId = externalTransactionId;
            await UpdateAsync(payment);
            return true;
        }
    }
}
