using GroupManagementService.Models;
using GroupManagementService.Services;
using Microsoft.AspNetCore.Mvc;

namespace GroupManagementService.Controllers
{
    [ApiController]
    [Route("api/usage")] 
    public class UsageController : ControllerBase
    {
        private readonly UsageService _service;
        public UsageController(UsageService service) => _service = service;

        // Ghi nhận lịch sử sử dụng
        [HttpPost("group/{groupId}/log")]
        public async Task<IActionResult> LogUsage(int groupId, [FromBody] UsageLogRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                await _service.LogUsageAsync(groupId, request);
                return Ok(new { message = "Usage recorded" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // Lấy lịch sử sử dụng theo nhóm
        [HttpGet("group/{groupId}")]
        public async Task<IActionResult> GetUsage(int groupId)
        {
            var data = await _service.GetUsageByGroupAsync(groupId);
            return Ok(data);
        }

        // Phân tích sử dụng
        [HttpGet("group/{groupId}/analysis")]
        public async Task<IActionResult> Analyze(int groupId)
        {
            var res = await _service.AnalyzeUsageAsync(groupId);
            return Ok(res);
        }

        // Gợi ý lịch sử dụng công bằng
        [HttpGet("group/{groupId}/suggestions")]
        public async Task<IActionResult> Suggest(int groupId)
        {
            var res = await _service.SuggestFairScheduleAsync(groupId);
            return Ok(res);
        }
    }
}


