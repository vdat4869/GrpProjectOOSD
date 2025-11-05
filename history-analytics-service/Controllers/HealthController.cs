using Microsoft.AspNetCore.Mvc;

namespace HistoryAnalyticsService.Controllers
{
	[ApiController]
	[Route("api/History")]
	public class HealthController : ControllerBase
	{
		[HttpGet("health")]
		public IActionResult Health()
		{
			return Ok(new { status = "Healthy", service = "history-analytics-service", timestamp = DateTime.UtcNow });
		}
	}
}
