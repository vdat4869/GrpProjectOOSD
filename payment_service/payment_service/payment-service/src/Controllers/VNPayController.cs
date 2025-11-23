using Microsoft.AspNetCore.Mvc;
using PaymentService.Services.Interfaces;
using System.ComponentModel.DataAnnotations;

namespace PaymentService.Controllers
{
    /// <summary>
    /// VNPay Payment Gateway Integration Controller
    /// 
    /// This controller handles callbacks from the Node.js VNPay service
    /// and processes payment status updates.
    /// 
    /// Documentation:
    /// - VNPay API: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
    /// - Library: https://github.com/lehuygiang28/vnpay
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class VNPayController : ControllerBase
    {
        private readonly IPaymentGatewayService _paymentGatewayService;
        private readonly ILogger<VNPayController> _logger;

        public VNPayController(
            IPaymentGatewayService paymentGatewayService,
            ILogger<VNPayController> logger)
        {
            _paymentGatewayService = paymentGatewayService;
            _logger = logger;
        }

        /// <summary>
        /// Handle VNPay payment callback from Node.js service
        /// POST /api/VNPay/callback
        /// </summary>
        [HttpPost("callback")]
        public async Task<IActionResult> HandleCallback([FromBody] VNPayCallbackDto callback)
        {
            try
            {
                _logger.LogInformation($"[VNPay Callback] Received callback for order: {callback.OrderId}");
                _logger.LogInformation($"[VNPay Callback] Status: {callback.Status}, Amount: {callback.Amount}");

                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("[VNPay Callback] Invalid model state");
                    return BadRequest(new { 
                        success = false, 
                        message = "Invalid callback data",
                        errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
                    });
                }

                // Process the payment callback
                var result = await _paymentGatewayService.ProcessVNPayCallbackAsync(callback);

                if (result)
                {
                    _logger.LogInformation($"[VNPay Callback] Successfully processed order: {callback.OrderId}");
                    return Ok(new { 
                        success = true, 
                        message = "Payment processed successfully",
                        orderId = callback.OrderId
                    });
                }

                _logger.LogWarning($"[VNPay Callback] Failed to process order: {callback.OrderId}");
                return BadRequest(new { 
                    success = false, 
                    message = "Failed to process payment" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[VNPay Callback] Error processing callback for order: {callback?.OrderId}");
                return StatusCode(500, new { 
                    success = false, 
                    message = ex.Message 
                });
            }
        }

        /// <summary>
        /// Test endpoint to verify VNPay controller is working
        /// GET /api/VNPay/health
        /// </summary>
        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new
            {
                controller = "VNPayController",
                status = "healthy",
                timestamp = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// VNPay callback DTO
    /// </summary>
    public class VNPayCallbackDto
    {
        [Required]
        public string OrderId { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [Required]
        public string Status { get; set; } = string.Empty;

        public string? TransactionNo { get; set; }

        [Required]
        public string PaymentMethod { get; set; } = "VNPay";

        public string? CostShareDetailId { get; set; }

        public string? WalletId { get; set; }
    }
}

