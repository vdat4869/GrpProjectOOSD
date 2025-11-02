using GroupManagementService.Models;
using GroupManagementService.Services;
using Microsoft.AspNetCore.Mvc;

namespace GroupManagementService.Controllers
{
    [ApiController]
    [Route("api/funds")]
    public class FundsController : ControllerBase
    {
        private readonly FundService _service;
        public FundsController(FundService service) => _service = service;

        // Tạo quỹ cho nhóm
        [HttpPost("group/{groupId}")]
        public async Task<IActionResult> CreateFund(int groupId, [FromBody] CreateFundRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var fund = await _service.CreateFundAsync(groupId, request.Name);
                return Ok(fund);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // Lấy danh sách quỹ của nhóm
        [HttpGet("group/{groupId}")]
        public async Task<IActionResult> GetFunds(int groupId)
        {
            var funds = await _service.GetFundsByGroupAsync(groupId);
            return Ok(funds);
        }

        // Lấy chi tiết quỹ
        [HttpGet("{fundId}")]
        public async Task<IActionResult> GetFund(int fundId)
        {
            var fund = await _service.GetFundAsync(fundId);
            return fund == null ? NotFound() : Ok(fund);
        }

        // Nạp tiền
        [HttpPost("{fundId}/deposit")]
        public async Task<IActionResult> Deposit(int fundId, [FromBody] DepositRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var fund = await _service.DepositAsync(fundId, request.Amount, request.Description);
                return Ok(fund);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // Rút tiền
        [HttpPost("{fundId}/withdraw")]
        public async Task<IActionResult> Withdraw(int fundId, [FromBody] WithdrawRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var fund = await _service.WithdrawAsync(fundId, request.Amount, request.Description);
                return Ok(fund);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}


