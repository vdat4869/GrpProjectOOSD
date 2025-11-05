using Microsoft.AspNetCore.Mvc;

namespace BookingService.Controllers
{
	[ApiController]
	[Route("api/Booking")]
	public class HealthController : ControllerBase
	{
		[HttpGet("health")]
		public IActionResult Health()
		{
			return Ok(new { status = "Healthy", service = "booking-service", timestamp = DateTime.UtcNow });
		}
	}
}
