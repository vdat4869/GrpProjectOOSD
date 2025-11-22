using Microsoft.AspNetCore.Mvc;

namespace BookingService.Controllers
{
	/// <summary>
	/// Controller xử lý health check endpoint
	/// Route: /api/Booking
	/// </summary>
	[ApiController]
	[Route("api/Booking")]
	public class HealthController : ControllerBase
	{
		/// <summary>
		/// Health check endpoint để kiểm tra trạng thái của service
		/// GET /api/Booking/health
		/// Thường được sử dụng bởi load balancer hoặc monitoring tools
		/// </summary>
		/// <returns>Trạng thái healthy của service và timestamp hiện tại</returns>
		[HttpGet("health")]
		public IActionResult Health()
		{
			return Ok(new { status = "Healthy", service = "booking-service", timestamp = DateTime.UtcNow });
		}
	}
}
