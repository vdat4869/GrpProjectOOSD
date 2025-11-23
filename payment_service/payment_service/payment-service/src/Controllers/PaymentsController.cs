using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentService.DTOs;
using PaymentService.Services.Interfaces;
using FluentValidation;
using System.Security.Cryptography;
using System.Text;

namespace PaymentService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentGatewayService _paymentGatewayService;
        private readonly IValidator<CreatePaymentDto> _createPaymentValidator;

        public PaymentsController(
            IPaymentGatewayService paymentGatewayService,
            IValidator<CreatePaymentDto> createPaymentValidator)
        {
            _paymentGatewayService = paymentGatewayService;
            _createPaymentValidator = createPaymentValidator;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentDto>> GetPayment(Guid id)
        {
            var payment = await _paymentGatewayService.GetPaymentAsync(id);
            if (payment == null)
                return NotFound();

            return Ok(payment);
        }

        [HttpPost]
        public async Task<ActionResult<PaymentDto>> CreatePayment([FromBody] CreatePaymentDto dto)
        {
            var validationResult = await _createPaymentValidator.ValidateAsync(dto);
            if (!validationResult.IsValid)
                return BadRequest(validationResult.Errors);

            var payment = await _paymentGatewayService.CreatePaymentAsync(dto);
            return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, payment);
        }

        [HttpPost("callback")]
        [AllowAnonymous]
        public async Task<ActionResult> ProcessCallback([FromBody] PaymentCallbackDto dto)
        {
            var result = await _paymentGatewayService.ProcessPaymentCallbackAsync(dto);
            if (!result)
                return BadRequest("Callback processing failed");

            return Ok();
        }

        // Payment gateway callbacks can be added here if needed

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<List<PaymentDto>>> GetPaymentsByUser(string userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            // Support both GUID and numeric userId (from auth service)
            if (!Guid.TryParse(userId, out var userGuid))
            {
                // userId is not a GUID (might be a numeric ID from auth service)
                // Return empty list as we cannot find payments without GUID
                return Ok(new List<PaymentDto>());
            }
            
            var payments = await _paymentGatewayService.GetPaymentsByUserAsync(userGuid, page, pageSize);
            return Ok(payments);
        }

        [HttpPost("{id}/cancel")]
        public async Task<ActionResult> CancelPayment(Guid id)
        {
            var result = await _paymentGatewayService.CancelPaymentAsync(id);
            if (!result)
                return BadRequest("Payment cancellation failed");

            return Ok();
        }

        [HttpPost("{id}/refund")]
        public async Task<ActionResult> RefundPayment(Guid id, [FromBody] RefundRequest? request = null)
        {
            var result = await _paymentGatewayService.RefundPaymentAsync(id, request?.Amount);
            if (!result)
                return BadRequest("Payment refund failed");

            return Ok();
        }
    }

    public class RefundRequest
    {
        public decimal? Amount { get; set; }
    }
}
