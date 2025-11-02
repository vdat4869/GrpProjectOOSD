using GroupManagementService.Models;  
using GroupManagementService.Services;  
using Microsoft.AspNetCore.Mvc; 

namespace GroupManagementService.Controllers
{
    // Đánh dấu class này là API Controller
    [ApiController]
    // Đặt route mặc định cho tất cả các action trong controller này
    [Route("api/voting")]
    public class VotingController : ControllerBase
    {
        // Khai báo service để xử lý logic nghiệp vụ liên quan đến bỏ phiếu
        private readonly VotingService _service;
        
        // Constructor: nhận VotingService thông qua dependency injection và gán vào _service
        public VotingController(VotingService service) => _service = service;

        // API endpoint POST với groupId: tạo một cuộc bỏ phiếu mới trong nhóm
        [HttpPost("{groupId}")]
        public async Task<IActionResult> CreateVote(int groupId, [FromBody] CreateVoteRequest request)
        {
            // Kiểm tra dữ liệu đầu vào có hợp lệ không (validation)
            if (!ModelState.IsValid)
            {
                // Nếu không hợp lệ thì trả về 400 Bad Request kèm thông báo lỗi
                return BadRequest(ModelState);
            }

            try
            {
                // Gọi service để tạo cuộc bỏ phiếu mới với topic từ request
                var vote = await _service.CreateVoteAsync(groupId, request.Topic);
                // Trả về 200 OK với dữ liệu cuộc bỏ phiếu vừa tạo
                return Ok(vote);
            }
            catch (Exception ex)
            {
                // Nếu có lỗi (ví dụ: nhóm không tồn tại) thì trả về 400 Bad Request
                return BadRequest(new { error = ex.Message });
            }
        }

        // API endpoint GET: lấy danh sách cuộc bỏ phiếu theo nhóm
        [HttpGet("group/{groupId}")]
        public async Task<IActionResult> GetVotesByGroup(int groupId)
        {
            var votes = await _service.GetVotesByGroupAsync(groupId);
            return Ok(votes);
        }

        // API endpoint GET: lấy chi tiết một cuộc bỏ phiếu
        [HttpGet("{voteId}")]
        public async Task<IActionResult> GetVote(int voteId)
        {
            var vote = await _service.GetVoteByIdAsync(voteId);
            return vote == null ? NotFound() : Ok(vote);
        }

        // API endpoint DELETE: xóa một cuộc bỏ phiếu
        [HttpDelete("{voteId}")]
        public async Task<IActionResult> DeleteVote(int voteId)
        {
            var ok = await _service.DeleteVoteAsync(voteId);
            return ok ? NoContent() : NotFound();
        }

        // API endpoint POST với voteId: bỏ phiếu (đồng ý hoặc không đồng ý) cho một cuộc bỏ phiếu
        [HttpPost("{voteId}/cast")]
        public async Task<IActionResult> CastVote(int voteId, [FromBody] CastVoteRequest request)
        {
            // Kiểm tra dữ liệu đầu vào có hợp lệ không (validation)
            if (!ModelState.IsValid)
            {
                // Nếu không hợp lệ thì trả về 400 Bad Request kèm thông báo lỗi
                return BadRequest(ModelState);
            }

            try
            {
                // Gọi service để ghi nhận phiếu bầu của thành viên (MemberId) cho cuộc bỏ phiếu (voteId)
                // request.Agree = true nghĩa là đồng ý, false nghĩa là không đồng ý
                await _service.CastVoteAsync(voteId, request.MemberId, request.Agree);
                // Trả về 200 OK với object chứa thông báo đã ghi nhận phiếu bầu
                return Ok(new { message = "Vote recorded successfully" });
            }
            catch (Exception ex)
            {
                // Nếu có lỗi (ví dụ: cuộc bỏ phiếu không tồn tại) thì trả về 400 Bad Request
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
