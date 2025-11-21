using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public TransactionsController(
            IPaymentService paymentService,
            IValidator<CreateTransactionDto> createTransactionValidator,
            ILogger<TransactionsController> logger)
        {
            _paymentService = paymentService;
            _createTransactionValidator = createTransactionValidator;
            _logger = logger;
        }

        /// <summary>
        /// Get transactions by wallet ID
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<TransactionDto>>> GetTransactions(
            [FromQuery] Guid walletId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (walletId == Guid.Empty)
            {
                return BadRequest(new { message = "WalletId is required" });
            }

            var transactions = await _paymentService.GetTransactionsAsync(walletId, page, pageSize);
            return Ok(transactions);
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

