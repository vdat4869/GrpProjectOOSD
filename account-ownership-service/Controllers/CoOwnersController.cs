using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using AccountOwnershipService.DTOs;
using AccountOwnershipService.Commands;
using AccountOwnershipService.Queries;

namespace AccountOwnershipService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CoOwnersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<CoOwnersController> _logger;

    public CoOwnersController(IMediator mediator, ILogger<CoOwnersController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get all co-owners
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<List<CoOwnerDto>>> GetAllCoOwners([FromQuery] bool? isVerified, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null)
    {
        var query = new GetAllCoOwnersQuery(isVerified, page, pageSize, search);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Get co-owner by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<CoOwnerDto>> GetCoOwnerById(Guid id)
    {
        var query = new GetCoOwnerByIdQuery(id);
        var result = await _mediator.Send(query);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    /// <summary>
    /// Get co-owner by User ID
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<CoOwnerDto>> GetCoOwnerByUserId(string userId)
    {
        var query = new GetCoOwnerByUserIdQuery(userId);
        var result = await _mediator.Send(query);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new co-owner
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<CoOwnerDto>> CreateCoOwner([FromBody] CreateCoOwnerDto dto)
    {
        try
        {
            var command = new CreateCoOwnerCommand(dto);
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetCoOwnerById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update co-owner information
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<CoOwnerDto>> UpdateCoOwner(Guid id, [FromBody] UpdateCoOwnerDto dto)
    {
        try
        {
            var command = new UpdateCoOwnerCommand(id, dto);
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete co-owner (Admin/Staff)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult> DeleteCoOwner(Guid id)
    {
        var success = await _mediator.Send(new DeleteCoOwnerCommand(id));
        if (!success) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Verify co-owner (Admin/Staff only)
    /// </summary>
    [HttpPost("{id}/verify")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<CoOwnerDto>> VerifyCoOwner(Guid id)
    {
        try
        {
            var command = new VerifyCoOwnerCommand(id);
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

