using Microsoft.AspNetCore.Mvc;

namespace GroupManagementService.Controllers
{
	[ApiController]
	[Route("api/Group")]
	public class HealthController : ControllerBase
	{
		[HttpGet("health")]
		public IActionResult Health()
		{
			return Ok(new { status = "Healthy", service = "group-management-service", timestamp = DateTime.UtcNow });
		}
	}
}
