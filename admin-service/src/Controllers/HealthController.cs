using Microsoft.AspNetCore.Mvc;

namespace AdminService.Controllers
{
	[ApiController]
	[Route("api/Admin")]
	public class HealthController : ControllerBase
	{
		[HttpGet("health")]
		public IActionResult Health()
		{
			return Ok(new { status = "Healthy", service = "admin-service", timestamp = DateTime.UtcNow });
		}
	}
}
