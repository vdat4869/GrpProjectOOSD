using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.DTOs;
using PaymentService.Services.Interfaces;
using FluentValidation;

namespace PaymentService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TransactionsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly IValidator<CreateTransactionDto> _createTransactionValidator;
        private readonly ILogger<TransactionsController> _logger;
        private readonly PaymentDbContext _context;

        public TransactionsController(
            IPaymentService paymentService,
            IValidator<CreateTransactionDto> createTransactionValidator,
            ILogger<TransactionsController> logger,
            PaymentDbContext context)
        {
            _paymentService = paymentService;
            _createTransactionValidator = createTransactionValidator;
            _logger = logger;
            _context = context;
        }

        /// <summary>
        /// Get transactions by wallet ID
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<TransactionDto>>> GetTransactions(
            [FromQuery] string? walletId = null,
            [FromQuery] string? userId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            // Support both walletId (Guid) and userId (string/int) for backward compatibility
            List<Guid> walletGuids = new List<Guid>();
            
            if (!string.IsNullOrEmpty(walletId))
            {
                if (Guid.TryParse(walletId, out var walletGuid))
                {
                    // First, try to find wallet by ID
                    var walletById = await _context.Wallets
                        .FirstOrDefaultAsync(w => w.Id == walletGuid && w.IsActive);
                    
                    if (walletById != null)
                    {
                        // Found wallet by ID, use it
                        walletGuids.Add(walletGuid);
                        _logger.LogInformation("Found wallet by ID: {WalletId}", walletGuid);
                    }
                    else
                    {
                        // Not found by ID, try to find wallets by UserId (CoOwnerId)
                        // This handles the case where frontend sends coOwnerId as walletId
                        var walletsByUserId = await _context.Wallets
                            .Where(w => w.UserId == walletGuid && w.IsActive)
                            .Select(w => w.Id)
                            .ToListAsync();
                        
                        if (walletsByUserId.Count > 0)
                        {
                            walletGuids.AddRange(walletsByUserId);
                            _logger.LogInformation("Found {Count} wallets by UserId (CoOwnerId): {UserId}", walletsByUserId.Count, walletGuid);
                        }
                        else
                        {
                            // No wallets found, return empty list
                            _logger.LogInformation("No wallets found for walletId/UserId: {WalletId}", walletGuid);
                            return Ok(new List<TransactionDto>());
                        }
                    }
                }
                else
                {
                    return BadRequest(new { message = "Invalid walletId format. Must be a valid GUID." });
                }
            }
            else if (!string.IsNullOrEmpty(userId))
            {
                // If userId is provided, find all wallets for this user
                Guid userGuid;
                if (Guid.TryParse(userId, out userGuid))
                {
                    // Get all wallets for this user (GUID)
                    var wallets = await _context.Wallets
                        .Where(w => w.UserId == userGuid && w.IsActive)
                        .Select(w => w.Id)
                        .ToListAsync();
                    
                    if (wallets.Count == 0)
                    {
                        // No wallets found for this user, return empty list
                        _logger.LogInformation("No wallets found for userId: {UserId}", userId);
                        return Ok(new List<TransactionDto>());
                    }
                    
                    walletGuids.AddRange(wallets);
                    _logger.LogInformation("Found {Count} wallets for userId: {UserId}", wallets.Count, userId);
                }
                else
                {
                    // userId is not a GUID (might be a numeric ID from auth service)
                    // Frontend should send coOwnerId (GUID) instead of userId (numeric)
                    // For now, return empty list and log warning
                    _logger.LogWarning("userId is not a valid GUID: {UserId}. Frontend should send coOwnerId (GUID) instead. Returning empty transactions list.", userId);
                    return Ok(new List<TransactionDto>());
                }
            }
            else
            {
                return BadRequest(new { message = "Either walletId or userId is required" });
            }

            if (walletGuids.Count == 0)
            {
                return Ok(new List<TransactionDto>());
            }

            // Get transactions from all wallets in one query
            var transactions = await _context.Transactions
                .Where(t => walletGuids.Contains(t.WalletId) && !t.IsDeleted)
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var transactionDtos = transactions.Select(t => new TransactionDto
            {
                Id = t.Id,
                WalletId = t.WalletId,
                Type = (int)t.Type,
                Amount = t.Amount,
                Currency = t.Currency ?? "VND",
                Description = t.Description,
                Reference = t.Reference,
                RelatedTransactionId = t.RelatedTransactionId,
                Status = (int)t.Status,
                ProcessedAt = t.ProcessedAt,
                Metadata = t.Metadata,
                CreatedAt = t.CreatedAt
            }).ToList();

            return Ok(transactionDtos);
        }

        /// <summary>
        /// Create a new transaction
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<TransactionDto>> CreateTransaction([FromBody] CreateTransactionDto dto)
        {
            var validationResult = await _createTransactionValidator.ValidateAsync(dto);
            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors);
            }

            try
            {
                var transaction = await _paymentService.CreateTransactionAsync(dto);
                return CreatedAtAction(nameof(GetTransactions), new { walletId = dto.WalletId }, transaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating transaction");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }
    }
}

