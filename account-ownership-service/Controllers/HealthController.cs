using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace AccountOwnershipService.Controllers
{
	[ApiController]
	[Route("api/Account")]
	public class HealthController : ControllerBase
	{
		[HttpGet("health")]
		[AllowAnonymous]
		public IActionResult Health()
		{
			return Ok(new { status = "Healthy", service = "account-ownership-service", timestamp = DateTime.UtcNow });
		}
	}
}
