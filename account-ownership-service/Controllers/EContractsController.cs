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
public class EContractsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<EContractsController> _logger;

    public EContractsController(IMediator mediator, ILogger<EContractsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get e-contracts by vehicle group
    /// </summary>
    [HttpGet("vehicle-group/{vehicleGroupId}")]
    public async Task<ActionResult<List<EContractDto>>> GetEContractsByVehicleGroup(
        Guid vehicleGroupId,
        [FromQuery] string? status)
    {
        var query = new GetEContractsByVehicleGroupQuery(vehicleGroupId, status);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Create a new e-contract
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<EContractDto>> CreateEContract([FromBody] CreateEContractDto dto)
    {
        try
        {
            var command = new CreateEContractCommand(dto);
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetEContractsByVehicleGroup),
                new { vehicleGroupId = result.VehicleGroupId }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Sign an e-contract
    /// </summary>
    [HttpPost("{id}/sign")]
    public async Task<ActionResult<EContractDto>> SignEContract(Guid id, [FromBody] SignEContractRequest request)
    {
        try
        {
            var command = new SignEContractCommand(id, request.DigitalSignature);
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
    /// Delete an e-contract
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEContract(Guid id)
    {
        try
        {
            var command = new DeleteEContractCommand(id);
            await _mediator.Send(command);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

public class SignEContractRequest
{
    public string DigitalSignature { get; set; } = string.Empty;
}

