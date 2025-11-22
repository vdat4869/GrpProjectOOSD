using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using OwnershipService.DTOs;
using OwnershipService.Commands;
using OwnershipService.Queries;

namespace OwnershipService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OwnershipsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<OwnershipsController> _logger;

    public OwnershipsController(IMediator mediator, ILogger<OwnershipsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get all ownerships
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<OwnershipDto>>> GetAllOwnerships(
        [FromQuery] bool? isActive = null,
        [FromQuery] Guid? vehicleGroupId = null,
        [FromQuery] Guid? coOwnerId = null)
    {
        var query = new GetAllOwnershipsQuery(isActive, vehicleGroupId, coOwnerId);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Get ownerships by vehicle group
    /// </summary>
    [HttpGet("vehicle-group/{vehicleGroupId}")]
    public async Task<ActionResult<List<OwnershipDto>>> GetOwnershipsByVehicleGroup(
        Guid vehicleGroupId, 
        [FromQuery] bool? isActive)
    {
        var query = new GetOwnershipsByVehicleGroupQuery(vehicleGroupId, isActive);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Get ownerships by co-owner
    /// </summary>
    [HttpGet("co-owner/{coOwnerId}")]
    public async Task<ActionResult<List<OwnershipDto>>> GetOwnershipsByCoOwner(
        Guid coOwnerId, 
        [FromQuery] bool? isActive)
    {
        var query = new GetOwnershipsByCoOwnerQuery(coOwnerId, isActive);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Create a new ownership
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<OwnershipDto>> CreateOwnership([FromBody] CreateOwnershipDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var command = new CreateOwnershipCommand(dto);
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetOwnershipsByVehicleGroup), 
                new { vehicleGroupId = result.VehicleGroupId }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update ownership
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<OwnershipDto>> UpdateOwnership(Guid id, [FromBody] UpdateOwnershipDto dto)
    {
        try
        {
            var command = new UpdateOwnershipCommand(id, dto);
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete ownership
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<ActionResult> DeleteOwnership(Guid id)
    {
        try
        {
            var command = new DeleteOwnershipCommand(id);
            await _mediator.Send(command);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

