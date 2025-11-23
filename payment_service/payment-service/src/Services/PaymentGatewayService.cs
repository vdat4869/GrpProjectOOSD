using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.DTOs;
using PaymentService.Models;
using PaymentService.Services.Interfaces;
using PaymentService.Microservice.MessageQueue;
using PaymentService.Services;
using System.Net.Http.Json;

namespace PaymentService.Services
{
    public class PaymentGatewayService : IPaymentGatewayService
    {
        private readonly PaymentDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PaymentGatewayService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly RabbitMQService? _rabbitMQService;

        public PaymentGatewayService(
            PaymentDbContext context, 
            IMapper mapper, 
            IConfiguration configuration,
            ILogger<PaymentGatewayService> logger,
            IHttpClientFactory httpClientFactory,
            RabbitMQService? rabbitMQService = null)
        {
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
            _rabbitMQService = rabbitMQService;
        }

        public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto dto)
        {
            var payment = _mapper.Map<Payment>(dto);
            // Generate unique transaction ID based on current time (Vietnam timezone)
            payment.TransactionId = TimeZoneHelper.Now.ToString("yyyyMMddHHmmssfff");
            payment.Status = PaymentStatus.Pending;

            // Payment URL generation (if needed for specific payment methods)
            payment.PaymentUrl = string.Empty;

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            // Publish PaymentCreated event
            if (_rabbitMQService != null)
            {
                try
                {
                    _rabbitMQService.PublishMessage("payment.created", "payment.created", new Microservice.MessageQueue.PaymentCreatedMessage
                    {
                        PaymentId = payment.Id,
                        UserId = payment.CostShareDetail?.UserId ?? Guid.Empty,
                        GroupId = payment.CostShareDetail?.CostShare?.GroupId ?? Guid.Empty,
                        Amount = payment.Amount,
                        Currency = payment.Currency,
                        PaymentMethod = payment.Method.ToString(),
                        CreatedAt = DateTime.UtcNow
                    });
                    _logger.LogInformation("Published PaymentCreated event for payment {PaymentId}", payment.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to publish PaymentCreated event for payment {PaymentId}", payment.Id);
                }
            }
            
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
                
                // Mark cost share detail as paid (load without Include to avoid join issues)
                var costShareDetail = await _context.CostShareDetails
                    .FirstOrDefaultAsync(csd => csd.Id == payment.CostShareDetailId);
                
                if (costShareDetail != null)
                {
                    // Load CostShare separately to avoid join issues
                    await _context.Entry(costShareDetail)
                        .Reference(csd => csd.CostShare)
                        .LoadAsync();
                    
                    if (costShareDetail.CostShare == null)
                    {
                        _logger.LogWarning($"[Payment Gateway] Cost share not found for detail: {costShareDetail.Id}");
                    }
                    else
                    {
                        costShareDetail.Status = CostShareDetailStatus.Paid;
                        costShareDetail.PaidDate = DateTime.UtcNow;
                        costShareDetail.UpdatedAt = DateTime.UtcNow;
                        
                        // Check if all cost share details are paid, then update CostShare status
                        await _context.Entry(costShareDetail.CostShare)
                            .Collection(cs => cs.CostShareDetails)
                            .LoadAsync();
                        
                        var allDetailsPaid = costShareDetail.CostShare.CostShareDetails
                            .Where(csd => !csd.IsDeleted)
                            .All(csd => csd.Status == CostShareDetailStatus.Paid);
                        
                        if (allDetailsPaid && costShareDetail.CostShare.Status != CostShareStatus.Paid)
                        {
                            costShareDetail.CostShare.Status = CostShareStatus.Paid;
                            costShareDetail.CostShare.PaidDate = DateTime.UtcNow;
                            costShareDetail.CostShare.UpdatedAt = DateTime.UtcNow;
                            _logger.LogInformation($"[Payment Gateway] All cost share details paid, updated CostShare {costShareDetail.CostShare.Id} status to Paid");
                        }
                        
                        // Find or create wallet for user and group
                        var wallet = await _context.Wallets
                            .FirstOrDefaultAsync(w => w.UserId == costShareDetail.UserId && 
                                                      w.GroupId == costShareDetail.CostShare.GroupId && 
                                                      w.IsActive);
                        
                        if (wallet == null)
                        {
                            // Create wallet if it doesn't exist
                            wallet = new Wallet
                            {
                                Id = Guid.NewGuid(),
                                UserId = costShareDetail.UserId,
                                GroupId = costShareDetail.CostShare.GroupId,
                                Balance = 0,
                                FrozenAmount = 0,
                                Currency = payment.Currency,
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                            _context.Wallets.Add(wallet);
                            _logger.LogInformation($"[Payment Gateway] Created wallet {wallet.Id} for user {costShareDetail.UserId} and group {costShareDetail.CostShare.GroupId}");
                        }
                        
                        // Create transaction record for this payment
                        var transaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            WalletId = wallet.Id,
                            Type = TransactionType.Payment,
                            Amount = payment.Amount,
                            Currency = payment.Currency,
                            Description = $"Thanh toán cho cost share: {costShareDetail.CostShare.Title}",
                            Reference = payment.TransactionId,
                            Status = PaymentStatus.Completed,
                            ProcessedAt = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.Transactions.Add(transaction);
                        _logger.LogInformation($"[Payment Gateway] Created transaction {transaction.Id} for payment {payment.TransactionId}");
                    }
                }

                // Publish PaymentCompleted event
                if (_rabbitMQService != null)
                {
                    try
                    {
                        _rabbitMQService.PublishMessage("payment.completed", "payment.completed", new Microservice.MessageQueue.PaymentCompletedMessage
                        {
                            PaymentId = payment.Id,
                            UserId = costShareDetail?.UserId ?? Guid.Empty,
                            GroupId = costShareDetail?.CostShare?.GroupId ?? Guid.Empty,
                            Amount = payment.Amount,
                            Currency = payment.Currency,
                            TransactionId = payment.TransactionId ?? string.Empty,
                            CompletedAt = DateTime.UtcNow
                        });
                        _logger.LogInformation("Published PaymentCompleted event for payment {PaymentId}", payment.Id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to publish PaymentCompleted event for payment {PaymentId}", payment.Id);
                    }
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
                _logger.LogInformation($"[VNPay Service] Payment not found for order: {callback.OrderId}, creating new payment...");
                
                // Create payment if it doesn't exist (VNPay service may not have created it)
                if (string.IsNullOrEmpty(callback.CostShareDetailId) || !Guid.TryParse(callback.CostShareDetailId, out var costShareDetailId))
                {
                    _logger.LogWarning($"[VNPay Service] Cannot create payment: CostShareDetailId is missing or invalid: {callback.CostShareDetailId}");
                    return false;
                }
                
                // Verify cost share detail exists (load without Include to avoid join issues)
                var costShareDetail = await _context.CostShareDetails
                    .FirstOrDefaultAsync(csd => csd.Id == costShareDetailId && !csd.IsDeleted);
                
                if (costShareDetail == null)
                {
                    _logger.LogWarning($"[VNPay Service] Cost share detail not found: {costShareDetailId}");
                    return false;
                }
                
                // Load CostShare separately to avoid join issues
                await _context.Entry(costShareDetail)
                    .Reference(csd => csd.CostShare)
                    .LoadAsync();
                
                if (costShareDetail.CostShare == null)
                {
                    _logger.LogWarning($"[VNPay Service] Cost share not found for detail: {costShareDetailId}");
                    return false;
                }
                
                // Find or create wallet for user and group first
                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == costShareDetail.UserId && 
                                              w.GroupId == costShareDetail.CostShare.GroupId && 
                                              w.IsActive);
                
                if (wallet == null)
                {
                    // Create wallet if it doesn't exist
                    wallet = new Wallet
                    {
                        Id = Guid.NewGuid(),
                        UserId = costShareDetail.UserId,
                        GroupId = costShareDetail.CostShare.GroupId,
                        Balance = 0,
                        FrozenAmount = 0,
                        Currency = "VND",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Wallets.Add(wallet);
                    await _context.SaveChangesAsync(); // Save wallet first to get the ID
                    _logger.LogInformation($"[VNPay Service] Created wallet {wallet.Id} for user {costShareDetail.UserId} and group {costShareDetail.CostShare.GroupId}");
                }
                
                // Create new payment record
                payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    TransactionId = callback.OrderId,
                    CostShareDetailId = costShareDetailId,
                    WalletId = wallet.Id,
                    Amount = callback.Amount,
                    Currency = "VND",
                    Status = callback.Status.ToLower() == "success" ? PaymentStatus.Completed : PaymentStatus.Pending,
                    Method = PaymentMethodType.Banking, // VNPay uses banking
                    ExternalTransactionId = callback.TransactionNo,
                    ProcessedAt = callback.Status.ToLower() == "success" ? DateTime.UtcNow : (DateTime?)null,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                };
                
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"[VNPay Service] Created payment {payment.Id} for order: {callback.OrderId}");
            }

            // Update payment status
            payment.Status = callback.Status.ToLower() == "success" ? PaymentStatus.Completed : PaymentStatus.Failed;
            payment.ExternalTransactionId = callback.TransactionNo;
            payment.ProcessedAt = DateTime.UtcNow;
            payment.UpdatedAt = DateTime.UtcNow;

            if (payment.Status == PaymentStatus.Completed)
            {
                _logger.LogInformation($"[VNPay Service] Payment successful for order: {callback.OrderId}");
                
                // Mark cost share detail as paid (load without Include to avoid join issues)
                var costShareDetail = await _context.CostShareDetails
                    .FirstOrDefaultAsync(csd => csd.Id == payment.CostShareDetailId);
                
                if (costShareDetail == null)
                {
                    _logger.LogWarning($"[VNPay Service] Cost share detail not found for payment CostShareDetailId: {payment.CostShareDetailId}");
                }
                else
                {
                    // Load CostShare separately to avoid join issues
                    await _context.Entry(costShareDetail)
                        .Reference(csd => csd.CostShare)
                        .LoadAsync();
                    
                    if (costShareDetail.CostShare == null)
                    {
                        _logger.LogWarning($"[VNPay Service] Cost share not found for detail: {costShareDetail.Id}");
                    }
                    else
                    {
                        _logger.LogInformation($"[VNPay Service] Found cost share detail: {costShareDetail.Id}, UserId: {costShareDetail.UserId}, GroupId: {costShareDetail.CostShare.GroupId}");
                        
                        costShareDetail.Status = CostShareDetailStatus.Paid;
                        costShareDetail.PaidDate = DateTime.UtcNow;
                        costShareDetail.UpdatedAt = DateTime.UtcNow;
                        _logger.LogInformation($"[VNPay Service] Updated cost share detail: {costShareDetail.Id}");
                        
                        // Check if all cost share details are paid, then update CostShare status
                        await _context.Entry(costShareDetail.CostShare)
                            .Collection(cs => cs.CostShareDetails)
                            .LoadAsync();
                        
                        var allDetailsPaid = costShareDetail.CostShare.CostShareDetails
                            .Where(csd => !csd.IsDeleted)
                            .All(csd => csd.Status == CostShareDetailStatus.Paid);
                        
                        if (allDetailsPaid && costShareDetail.CostShare.Status != CostShareStatus.Paid)
                        {
                            costShareDetail.CostShare.Status = CostShareStatus.Paid;
                            costShareDetail.CostShare.PaidDate = DateTime.UtcNow;
                            costShareDetail.CostShare.UpdatedAt = DateTime.UtcNow;
                            _logger.LogInformation($"[VNPay Service] All cost share details paid, updated CostShare {costShareDetail.CostShare.Id} status to Paid");
                        }
                    
                    // Find or create wallet for user and group
                    var wallet = await _context.Wallets
                        .FirstOrDefaultAsync(w => w.UserId == costShareDetail.UserId && 
                                                  w.GroupId == costShareDetail.CostShare.GroupId && 
                                                  w.IsActive);
                    
                    if (wallet == null)
                    {
                        // Create wallet if it doesn't exist
                        wallet = new Wallet
                        {
                            Id = Guid.NewGuid(),
                            UserId = costShareDetail.UserId,
                            GroupId = costShareDetail.CostShare.GroupId,
                            Balance = 0,
                            FrozenAmount = 0,
                            Currency = payment.Currency,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.Wallets.Add(wallet);
                        await _context.SaveChangesAsync(); // Save wallet first to get the ID
                        _logger.LogInformation($"[VNPay Service] Created wallet {wallet.Id} for user {costShareDetail.UserId} and group {costShareDetail.CostShare.GroupId}");
                    }
                    else
                    {
                        _logger.LogInformation($"[VNPay Service] Found existing wallet {wallet.Id} for user {costShareDetail.UserId} and group {costShareDetail.CostShare.GroupId}");
                    }
                    
                    // Create transaction record for this payment
                    var transaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        WalletId = wallet.Id,
                        Type = TransactionType.Payment, // Payment type
                        Amount = payment.Amount,
                        Currency = payment.Currency,
                        Description = $"Thanh toán cho cost share: {costShareDetail.CostShare.Title}",
                        Reference = payment.TransactionId,
                        Status = PaymentStatus.Completed,
                        ProcessedAt = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Transactions.Add(transaction);
                    _logger.LogInformation($"[VNPay Service] Created transaction {transaction.Id} for payment {payment.TransactionId}, wallet {wallet.Id}");
                    
                    // Try to deduct from group fund if available
                    await TryDeductFromGroupFundAsync(costShareDetail, payment);
                    }
                }

                // Publish PaymentCompleted event
                if (_rabbitMQService != null)
                {
                    try
                    {
                        _rabbitMQService.PublishMessage("payment.completed", "payment.completed", new Microservice.MessageQueue.PaymentCompletedMessage
                        {
                            PaymentId = payment.Id,
                            UserId = costShareDetail?.UserId ?? Guid.Empty,
                            GroupId = costShareDetail?.CostShare?.GroupId ?? Guid.Empty,
                            Amount = payment.Amount,
                            Currency = payment.Currency,
                            TransactionId = payment.TransactionId ?? string.Empty,
                            CompletedAt = DateTime.UtcNow
                        });
                        _logger.LogInformation("Published PaymentCompleted event for payment {PaymentId}", payment.Id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to publish PaymentCompleted event for payment {PaymentId}", payment.Id);
                    }
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
                .Where(p => p.CostShareDetail != null && p.CostShareDetail.UserId == userId && !p.IsDeleted)
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

        /// <summary>
        /// Try to deduct money from group fund when a cost share is paid
        /// </summary>
        private async Task TryDeductFromGroupFundAsync(Models.CostShareDetail costShareDetail, Payment payment)
        {
            try
            {
                if (costShareDetail?.CostShare?.GroupId == null)
                {
                    _logger.LogInformation($"[VNPay Service] No group ID found for cost share detail {costShareDetail?.Id}, skipping group fund deduction");
                    return;
                }

                var ownershipServiceUrl = _configuration["Services:OwnershipService:BaseUrl"] ?? "http://ownership-service:80";
                var deductUrl = $"{ownershipServiceUrl}/api/groupfunds/vehicle-group/{costShareDetail.CostShare.GroupId}/deduct-for-cost-share";

                var httpClient = _httpClientFactory.CreateClient();
                httpClient.Timeout = TimeSpan.FromSeconds(10); // Short timeout to avoid blocking payment processing

                var requestBody = new
                {
                    UserId = costShareDetail.UserId.ToString(), // Convert Guid to string to match CoOwner.UserId
                    Amount = payment.Amount,
                    Currency = payment.Currency,
                    Description = $"Thanh toán cost share: {costShareDetail.CostShare.Title}",
                    CostShareTitle = costShareDetail.CostShare.Title,
                    TransactionId = payment.TransactionId
                };

                var response = await httpClient.PostAsJsonAsync(deductUrl, requestBody);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"[VNPay Service] Successfully deducted {payment.Amount} {payment.Currency} from group fund {costShareDetail.CostShare.GroupId} for cost share payment");
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning($"[VNPay Service] Failed to deduct from group fund: {response.StatusCode} - {errorContent}. Payment will proceed without group fund deduction.");
                }
            }
            catch (Exception ex)
            {
                // Don't fail payment if group fund deduction fails
                _logger.LogWarning(ex, $"[VNPay Service] Error deducting from group fund for cost share payment. Payment will proceed without group fund deduction.");
            }
        }
}
}
