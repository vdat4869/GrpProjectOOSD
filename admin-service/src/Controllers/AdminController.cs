using AdminService.Models;
using AdminService.Services;
using Microsoft.AspNetCore.Mvc;

namespace AdminService.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly AdminCoreService _svc;
        public AdminController(AdminCoreService svc) => _svc = svc;

        // 1) Phê duyệt Service Order
        [HttpPost("service-orders/{id}/decision")]
        public async Task<IActionResult> DecideServiceOrder(int id, [FromBody] ApproveServiceOrderRequest req)
        {
            var result = await _svc.DecideServiceOrderAsync(id, req.Approve, req.Note);
            return result == null ? NotFound(new { message = "ServiceOrder not found" }) : Ok(result);
        }

        // 2) Xử lý tranh chấp
        [HttpPost("disputes/{id}/review")]
        public async Task<IActionResult> ReviewDispute(int id, [FromBody] ReviewDisputeRequest req)
        {
            var result = await _svc.ReviewDisputeAsync(id, req.Resolve, req.Note);
            return result == null ? NotFound(new { message = "Dispute not found" }) : Ok(result);
        }

        // 3) Báo cáo: tạo snapshot
        [HttpPost("reports/generate")]
        public async Task<IActionResult> GenerateReport([FromBody] ReportQuery q)
        {
            if (q.From == default || q.To == default) return BadRequest("Invalid period");
            var r = await _svc.GenerateReportAsync(q);
            return Ok(r);
        }

        // 3b) Báo cáo: truy vấn theo khoảng thời gian
        [HttpGet("reports")]
        public async Task<IActionResult> GetReports([FromQuery] int groupId,
                                                    [FromQuery] string type = "Financial",
                                                    [FromQuery] DateTime? from = null,
                                                    [FromQuery] DateTime? to = null)
        {
            if (from is null || to is null) return BadRequest("from/to required");
            var list = await _svc.GetReportsAsync(groupId, type, from.Value, to.Value);
            return Ok(list);
        }
    }
}
