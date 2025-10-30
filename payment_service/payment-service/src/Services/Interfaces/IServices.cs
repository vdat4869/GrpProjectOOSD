namespace PaymentService.Services.Interfaces
{
    public interface IPaymentService
    {
        Task<List<DTOs.TransactionDto>> GetTransactionsAsync(Guid walletId, int page = 1, int pageSize = 20);
        Task<DTOs.TransactionDto> CreateTransactionAsync(DTOs.CreateTransactionDto dto);
    }

    public interface ICostSharingService
    {
        Task<DTOs.CostShareDto?> GetCostShareAsync(Guid id);
        Task<List<DTOs.CostShareDto>> GetCostSharesByGroupAsync(Guid groupId, int page = 1, int pageSize = 20);
        Task<DTOs.CostShareDto> CreateCostShareAsync(DTOs.CreateCostShareDto dto);
        Task<DTOs.CostShareDto?> UpdateCostShareAsync(Guid id, DTOs.UpdateCostShareDto dto);
        Task<bool> DeleteCostShareAsync(Guid id);
        Task<List<DTOs.CostShareDetailDto>> GetCostShareDetailsAsync(Guid costShareId);
        Task<bool> MarkAsPaidAsync(Guid costShareDetailId);
    }

    // WalletService interface removed

    public interface IPaymentGatewayService
    {
        Task<DTOs.PaymentDto> CreatePaymentAsync(DTOs.CreatePaymentDto dto);
        Task<bool> ProcessPaymentCallbackAsync(DTOs.PaymentCallbackDto dto);
        Task<bool> ProcessVNPayCallbackAsync(Controllers.VNPayCallbackDto callback);
        Task<DTOs.PaymentDto?> GetPaymentAsync(Guid id);
        Task<DTOs.PaymentDto?> GetPaymentByOrderIdAsync(string orderId);
        Task<List<DTOs.PaymentDto>> GetPaymentsByUserAsync(Guid userId, int page = 1, int pageSize = 20);
        Task<bool> CancelPaymentAsync(Guid id);
        Task<bool> RefundPaymentAsync(Guid id, decimal? amount = null);
    }
}
