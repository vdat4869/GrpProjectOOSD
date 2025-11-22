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
                    walletGuids.Add(walletGuid);
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
                    // Get all wallets for this user
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
                    // Return empty list as we cannot find wallets without GUID
                    _logger.LogWarning("userId is not a valid GUID: {UserId}. Cannot find wallets. Returning empty transactions list.", userId);
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

