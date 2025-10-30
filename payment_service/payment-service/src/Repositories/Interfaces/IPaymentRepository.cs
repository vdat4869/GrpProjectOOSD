using PaymentService.Models;

namespace PaymentService.Repositories.Interfaces
{
    public interface IPaymentRepository : IRepository<Payment>
    {
        Task<IEnumerable<Payment>> GetByUserIdAsync(Guid userId, int page = 1, int pageSize = 20);
        Task<IEnumerable<Payment>> GetByWalletIdAsync(Guid walletId, int page = 1, int pageSize = 20);
        Task<IEnumerable<Payment>> GetByStatusAsync(PaymentStatus status, int page = 1, int pageSize = 20);
        Task<Payment?> GetByTransactionIdAsync(string transactionId);
        Task<bool> UpdateStatusAsync(Guid paymentId, PaymentStatus status, string? errorMessage = null);
        Task<bool> UpdateExternalTransactionIdAsync(Guid paymentId, string externalTransactionId);
    }
}
