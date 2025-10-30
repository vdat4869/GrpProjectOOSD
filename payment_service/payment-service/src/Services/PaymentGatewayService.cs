using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.DTOs;
using PaymentService.Models;
using PaymentService.Services.Interfaces;

namespace PaymentService.Services
{
    public interface IPaymentGatewayService
    {
        Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto dto);
        Task<bool> ProcessPaymentCallbackAsync(PaymentCallbackDto dto);
        Task<bool> ProcessVNPayCallbackAsync(Controllers.VNPayCallbackDto callback);
        Task<PaymentDto?> GetPaymentAsync(Guid id);
        Task<PaymentDto?> GetPaymentByOrderIdAsync(string orderId);
        Task<List<PaymentDto>> GetPaymentsByUserAsync(Guid userId, int page = 1, int pageSize = 20);
        Task<bool> CancelPaymentAsync(Guid id);
        Task<bool> RefundPaymentAsync(Guid id, decimal? amount = null);
    }

    public class PaymentGatewayService : IPaymentGatewayService
    {
        private readonly PaymentDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PaymentGatewayService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public PaymentGatewayService(
            PaymentDbContext context, 
            IMapper mapper, 
            IConfiguration configuration,
            ILogger<PaymentGatewayService> logger,
            IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto dto)
        {
            var payment = _mapper.Map<Payment>(dto);
            // Generate unique transaction ID based on current time
            payment.TransactionId = DateTime.UtcNow.AddHours(7).ToString("yyyyMMddHHmmssfff");
            payment.Status = PaymentStatus.Pending;

            // Payment URL generation (if needed for specific payment methods)
            payment.PaymentUrl = string.Empty;

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();
            
            return _mapper.Map<PaymentDto>(payment);
        }

        public async Task<bool> ProcessPaymentCallbackAsync(PaymentCallbackDto dto)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.TransactionId == dto.TransactionId && !p.IsDeleted);
            
            if (payment == null) return false;

            // Verify signature if provided
            if (!string.IsNullOrEmpty(dto.Signature) && !await VerifySignatureAsync(payment, dto.Signature))
            {
                payment.Status = PaymentStatus.Failed;
                payment.ErrorMessage = "Invalid signature";
                payment.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return false;
            }

            payment.Status = dto.Status;
            payment.ExternalTransactionId = dto.ExternalTransactionId;
            payment.ErrorMessage = dto.ErrorMessage;
            
            if (dto.Status == PaymentStatus.Completed)
            {
                payment.ProcessedAt = DateTime.UtcNow;
                
                // Mark cost share detail as paid
                var costShareDetail = await _context.CostShareDetails
                    .FirstOrDefaultAsync(csd => csd.Id == payment.CostShareDetailId);
                
                if (costShareDetail != null)
                {
                    costShareDetail.Status = CostShareDetailStatus.Paid;
                    costShareDetail.PaidDate = DateTime.UtcNow;
                    costShareDetail.UpdatedAt = DateTime.UtcNow;
                }
            }
            
            payment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            return true;
        }

        public async Task<bool> ProcessVNPayCallbackAsync(Controllers.VNPayCallbackDto callback)
        {
            _logger.LogInformation($"[VNPay Service] Processing callback for order: {callback.OrderId}");
            
            // Find payment by transaction ID (orderId)
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.TransactionId == callback.OrderId && !p.IsDeleted);
            
            if (payment == null)
            {
                _logger.LogWarning($"[VNPay Service] Payment not found for order: {callback.OrderId}");
                return false;
            }

            // Update payment status
            payment.Status = callback.Status.ToLower() == "success" ? PaymentStatus.Completed : PaymentStatus.Failed;
            payment.ExternalTransactionId = callback.TransactionNo;
            payment.ProcessedAt = DateTime.UtcNow;
            payment.UpdatedAt = DateTime.UtcNow;

            if (payment.Status == PaymentStatus.Completed)
            {
                _logger.LogInformation($"[VNPay Service] Payment successful for order: {callback.OrderId}");
                
                // Mark cost share detail as paid
                var costShareDetail = await _context.CostShareDetails
                    .FirstOrDefaultAsync(csd => csd.Id == payment.CostShareDetailId);
                
                if (costShareDetail != null)
                {
                    costShareDetail.Status = CostShareDetailStatus.Paid;
                    costShareDetail.PaidDate = DateTime.UtcNow;
                    costShareDetail.UpdatedAt = DateTime.UtcNow;
                    _logger.LogInformation($"[VNPay Service] Updated cost share detail: {costShareDetail.Id}");
                }

                // Wallet balance update removed (Wallets not in current schema)
            }
            else
            {
                _logger.LogWarning($"[VNPay Service] Payment failed for order: {callback.OrderId}");
            }
            
            await _context.SaveChangesAsync();
            _logger.LogInformation($"[VNPay Service] Callback processed successfully for order: {callback.OrderId}");
            
            return true;
        }

        public async Task<PaymentDto?> GetPaymentAsync(Guid id)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            
            return payment != null ? _mapper.Map<PaymentDto>(payment) : null;
        }

        public async Task<PaymentDto?> GetPaymentByOrderIdAsync(string orderId)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.TransactionId == orderId && !p.IsDeleted);
            
            return payment != null ? _mapper.Map<PaymentDto>(payment) : null;
        }

        public async Task<List<PaymentDto>> GetPaymentsByUserAsync(Guid userId, int page = 1, int pageSize = 20)
        {
            var payments = await _context.Payments
                .Include(p => p.CostShareDetail)
                .Where(p => p.CostShareDetail.UserId == userId && !p.IsDeleted)
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            
            return _mapper.Map<List<PaymentDto>>(payments);
        }

        public async Task<bool> CancelPaymentAsync(Guid id)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            
            if (payment == null || payment.Status != PaymentStatus.Pending) return false;

            payment.Status = PaymentStatus.Cancelled;
            payment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            return true;
        }

        public async Task<bool> RefundPaymentAsync(Guid id, decimal? amount = null)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
            
            if (payment == null || payment.Status != PaymentStatus.Completed) return false;

            var refundAmount = amount ?? payment.Amount;
            
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Create refund payment
                var refundPayment = new Payment
                {
                    CostShareDetailId = payment.CostShareDetailId,
                    WalletId = payment.WalletId,
                    Method = payment.Method,
                    Amount = refundAmount,
                    Currency = payment.Currency,
                    Status = PaymentStatus.Refunded,
                    TransactionId = Guid.NewGuid().ToString(),
                    ProcessedAt = DateTime.UtcNow,
                    Metadata = $"Refund for payment {payment.TransactionId}"
                };

                _context.Payments.Add(refundPayment);

                // Update original payment status
                payment.Status = PaymentStatus.Refunded;
                payment.UpdatedAt = DateTime.UtcNow;


                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                return false;
            }
        }

        private Task<bool> VerifySignatureAsync(Payment payment, string signature)
        {
            // Signature verification for payment gateways
            // Can be implemented for specific payment methods if needed
            return Task.FromResult(true);
        }
    }
}
