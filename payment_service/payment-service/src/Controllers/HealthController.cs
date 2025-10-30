using Microsoft.AspNetCore.Mvc;
using PaymentService.Data;

namespace PaymentService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly PaymentDbContext _context;

        public HealthController(PaymentDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult> Get()
        {
            try
            {
                // Check database connectivity
                await _context.Database.CanConnectAsync();
                
                return Ok(new
                {
                    status = "healthy",
                    timestamp = DateTime.UtcNow,
                    service = "payment-service",
                    version = "1.0.0"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(503, new
                {
                    status = "unhealthy",
                    timestamp = DateTime.UtcNow,
                    service = "payment-service",
                    error = ex.Message
                });
            }
        }
    }
}
