using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentService.DTOs;
using PaymentService.Services.Interfaces;
using FluentValidation;

namespace PaymentService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CostSharesController : ControllerBase
    {
        private readonly ICostSharingService _costSharingService;
        private readonly IValidator<CreateCostShareDto> _createCostShareValidator;

        public CostSharesController(
            ICostSharingService costSharingService,
            IValidator<CreateCostShareDto> createCostShareValidator)
        {
            _costSharingService = costSharingService;
            _createCostShareValidator = createCostShareValidator;
        }

        [HttpGet]
        public async Task<ActionResult<List<CostShareDto>>> GetCostShares([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var costShares = await _costSharingService.GetAllCostSharesAsync(page, pageSize);
            return Ok(costShares);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CostShareDto>> GetCostShare(Guid id)
        {
            var costShare = await _costSharingService.GetCostShareAsync(id);
            if (costShare == null)
                return NotFound();

            return Ok(costShare);
        }

        [HttpGet("group/{groupId}")]
        public async Task<ActionResult<List<CostShareDto>>> GetCostSharesByGroup(Guid groupId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var costShares = await _costSharingService.GetCostSharesByGroupAsync(groupId, page, pageSize);
            return Ok(costShares);
        }

        [HttpPost]
        public async Task<ActionResult<CostShareDto>> CreateCostShare([FromBody] CreateCostShareDto dto)
        {
            var validationResult = await _createCostShareValidator.ValidateAsync(dto);
            if (!validationResult.IsValid)
                return BadRequest(validationResult.Errors);

            try
            {
                var costShare = await _costSharingService.CreateCostShareAsync(dto);
                return CreatedAtAction(nameof(GetCostShare), new { id = costShare.Id }, costShare);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Internal endpoint for service-to-service calls (e.g., from ownership-service when proposal is approved)
        /// </summary>
        [HttpPost("internal")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous] // Allow internal service calls without authentication
        public async Task<ActionResult<CostShareDto>> CreateCostShareInternal([FromBody] CreateCostShareDto dto)
        {
            var validationResult = await _createCostShareValidator.ValidateAsync(dto);
            if (!validationResult.IsValid)
                return BadRequest(validationResult.Errors);

            try
            {
                var costShare = await _costSharingService.CreateCostShareAsync(dto);
                return CreatedAtAction(nameof(GetCostShare), new { id = costShare.Id }, costShare);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<CostShareDto>> UpdateCostShare(Guid id, [FromBody] UpdateCostShareDto dto)
        {
            // Basic validation
            if (dto == null)
                return BadRequest("Cost share data is required");

            var costShare = await _costSharingService.UpdateCostShareAsync(id, dto);
            if (costShare == null)
                return NotFound();

            return Ok(costShare);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteCostShare(Guid id)
        {
            var result = await _costSharingService.DeleteCostShareAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }

        [HttpGet("{costShareId}/details")]
        public async Task<ActionResult<List<CostShareDetailDto>>> GetCostShareDetails(Guid costShareId)
        {
            var details = await _costSharingService.GetCostShareDetailsAsync(costShareId);
            return Ok(details);
        }

        [HttpPost("{costShareDetailId}/mark-paid")]
        public async Task<ActionResult> MarkAsPaid(Guid costShareDetailId)
        {
            var result = await _costSharingService.MarkAsPaidAsync(costShareDetailId);
            if (!result)
                return NotFound();

            return Ok();
        }
    }
}
