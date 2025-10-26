using GroupManagementService.Models;
using GroupManagementService.Services;
using Microsoft.AspNetCore.Mvc;

namespace GroupManagementService.Controllers
{
    [ApiController]
    [Route("api/voting")]
    public class VotingController : ControllerBase
    {
        private readonly VotingService _service;
        public VotingController(VotingService service) => _service = service;

        [HttpPost("{groupId}")]
        public async Task<IActionResult> CreateVote(int groupId, [FromBody] CreateVoteRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var vote = await _service.CreateVoteAsync(groupId, request.Topic);
            return Ok(vote);
        }

        [HttpPost("{voteId}/cast")]
        public async Task<IActionResult> CastVote(int voteId, [FromBody] CastVoteRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await _service.CastVoteAsync(voteId, request.MemberId, request.Agree);
            return Ok("Vote recorded");
        }
    }
}
