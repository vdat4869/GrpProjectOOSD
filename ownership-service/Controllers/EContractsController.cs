using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using MediatR;
using OwnershipService.DTOs;
using OwnershipService.Commands;
using OwnershipService.Queries;

namespace OwnershipService.Controllers;

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
    /// Get all e-contracts
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<EContractDto>>> GetAllEContracts(
        [FromQuery] string? status = null,
        [FromQuery] Guid? vehicleGroupId = null,
        [FromQuery] Guid? coOwnerId = null)
    {
        var query = new GetAllEContractsQuery(status, vehicleGroupId, coOwnerId);
        var result = await _mediator.Send(query);
        return Ok(result);
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
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            _logger.LogInformation("Creating e-contract for CoOwnerId: {CoOwnerId}, VehicleGroupId: {VehicleGroupId}", 
                dto.CoOwnerId, dto.VehicleGroupId);
            
            var command = new CreateEContractCommand(dto);
            var result = await _mediator.Send(command);
            
            _logger.LogInformation("E-contract created successfully with ID: {ContractId}", result.Id);
            
            return CreatedAtAction(nameof(GetEContractsByVehicleGroup),
                new { vehicleGroupId = result.VehicleGroupId }, result);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Key not found while creating e-contract");
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation while creating e-contract");
            return BadRequest(new { message = ex.Message });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            _logger.LogError(ex, "Database error while creating e-contract");
            return StatusCode(500, new { message = "An error occurred while saving the contract. Please verify that all referenced entities exist." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while creating e-contract");
            return StatusCode(500, new { message = "An unexpected error occurred while creating the contract." });
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
    /// Get e-contract by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<EContractDto>> GetEContractById(Guid id)
    {
        var query = new GetEContractByIdQuery(id);
        var result = await _mediator.Send(query);
        
        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    /// <summary>
    /// Update an e-contract
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<EContractDto>> UpdateEContract(Guid id, [FromBody] UpdateEContractDto dto)
    {
        try
        {
            var command = new UpdateEContractCommand(id, dto);
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
    /// Approve e-contract (Staff/Admin only) - Duyệt hợp đồng pháp lý điện tử
    /// </summary>
    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<EContractDto>> ApproveEContract(Guid id, [FromBody] ApproveEContractRequest? request = null)
    {
        try
        {
            var command = new ApproveEContractCommand(id, request?.Notes);
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

public class ApproveEContractRequest
{
    public string? Notes { get; set; }
}

