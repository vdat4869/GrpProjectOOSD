using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using OwnershipService.Data;
using OwnershipService.DTOs;
using OwnershipService.Models;
using System.Security.Claims;

namespace OwnershipService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DisputesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DisputesController> _logger;

    public DisputesController(ApplicationDbContext context, ILogger<DisputesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all disputes with optional filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<DisputeDto>>> GetAllDisputes([FromQuery] string? status, [FromQuery] string? type)
    {
        var query = _context.Disputes.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<DisputeStatus>(status, true, out var statusEnum))
        {
            query = query.Where(d => d.Status == statusEnum);
        }

        if (!string.IsNullOrEmpty(type))
        {
            query = query.Where(d => d.Type == type);
        }

        var disputes = await query
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        var result = disputes.Select(d => new DisputeDto
        {
            Id = d.Id,
            Type = d.Type,
            Title = d.Title,
            Description = d.Description,
            Severity = d.Severity,
            RelatedId = d.RelatedId,
            RelatedType = d.RelatedType,
            Status = d.Status.ToString(),
            Notes = d.Notes,
            ResolvedBy = d.ResolvedBy,
            ResolvedAt = d.ResolvedAt,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        }).ToList();

        _logger.LogInformation("Retrieved {Count} disputes", result.Count);
        return Ok(result);
    }

    /// <summary>
    /// Get dispute by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<DisputeDto>> GetDisputeById(Guid id)
    {
        var dispute = await _context.Disputes.FindAsync(id);
        if (dispute == null)
            return NotFound();

        var result = new DisputeDto
        {
            Id = dispute.Id,
            Type = dispute.Type,
            Title = dispute.Title,
            Description = dispute.Description,
            Severity = dispute.Severity,
            RelatedId = dispute.RelatedId,
            RelatedType = dispute.RelatedType,
            Status = dispute.Status.ToString(),
            Notes = dispute.Notes,
            ResolvedBy = dispute.ResolvedBy,
            ResolvedAt = dispute.ResolvedAt,
            CreatedAt = dispute.CreatedAt,
            UpdatedAt = dispute.UpdatedAt
        };

        return Ok(result);
    }

    /// <summary>
    /// Create a new dispute
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<DisputeDto>> CreateDispute([FromBody] CreateDisputeDto dto)
    {
        var dispute = new Dispute
        {
            Type = dto.Type,
            Title = dto.Title,
            Description = dto.Description,
            Severity = dto.Severity,
            RelatedId = dto.RelatedId,
            RelatedType = dto.RelatedType,
            Status = DisputeStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Disputes.Add(dispute);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created dispute {DisputeId} of type {Type}", dispute.Id, dispute.Type);

        var result = new DisputeDto
        {
            Id = dispute.Id,
            Type = dispute.Type,
            Title = dispute.Title,
            Description = dispute.Description,
            Severity = dispute.Severity,
            RelatedId = dispute.RelatedId,
            RelatedType = dispute.RelatedType,
            Status = dispute.Status.ToString(),
            Notes = dispute.Notes,
            ResolvedBy = dispute.ResolvedBy,
            ResolvedAt = dispute.ResolvedAt,
            CreatedAt = dispute.CreatedAt,
            UpdatedAt = dispute.UpdatedAt
        };

        return CreatedAtAction(nameof(GetDisputeById), new { id = dispute.Id }, result);
    }

    /// <summary>
    /// Update dispute (Staff/Admin only)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<DisputeDto>> UpdateDispute(Guid id, [FromBody] UpdateDisputeDto dto)
    {
        var dispute = await _context.Disputes.FindAsync(id);
        if (dispute == null)
            return NotFound();

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

        if (!string.IsNullOrEmpty(dto.Status))
        {
            // Map frontend status strings to enum
            DisputeStatus? status = dto.Status.ToLower() switch
            {
                "pending" => DisputeStatus.Pending,
                "in_review" or "inreview" => DisputeStatus.InReview,
                "resolved" => DisputeStatus.Resolved,
                _ => null
            };
            
            if (status.HasValue)
            {
                dispute.Status = status.Value;
                if (status.Value == DisputeStatus.Resolved)
                {
                    dispute.ResolvedAt = DateTime.UtcNow;
                    dispute.ResolvedBy = userEmail ?? userId ?? "Unknown";
                }
            }
        }

        if (dto.Notes != null)
        {
            dispute.Notes = dto.Notes;
        }

        if (dto.ResolvedBy != null)
        {
            dispute.ResolvedBy = dto.ResolvedBy;
        }

        dispute.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated dispute {DisputeId} by user {UserId}", id, userId);

        var result = new DisputeDto
        {
            Id = dispute.Id,
            Type = dispute.Type,
            Title = dispute.Title,
            Description = dispute.Description,
            Severity = dispute.Severity,
            RelatedId = dispute.RelatedId,
            RelatedType = dispute.RelatedType,
            Status = dispute.Status.ToString(),
            Notes = dispute.Notes,
            ResolvedBy = dispute.ResolvedBy,
            ResolvedAt = dispute.ResolvedAt,
            CreatedAt = dispute.CreatedAt,
            UpdatedAt = dispute.UpdatedAt
        };

        return Ok(result);
    }

    /// <summary>
    /// Delete dispute (Admin only)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteDispute(Guid id)
    {
        var dispute = await _context.Disputes.FindAsync(id);
        if (dispute == null)
            return NotFound();

        _context.Disputes.Remove(dispute);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted dispute {DisputeId}", id);
        return NoContent();
    }

    /// <summary>
    /// Bulk create disputes (for auto-detection)
    /// </summary>
    [HttpPost("bulk")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<object>> BulkCreateDisputes([FromBody] List<CreateDisputeDto> dtos)
    {
        var disputes = dtos.Select(dto => new Dispute
        {
            Type = dto.Type,
            Title = dto.Title,
            Description = dto.Description,
            Severity = dto.Severity,
            RelatedId = dto.RelatedId,
            RelatedType = dto.RelatedType,
            Status = DisputeStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        }).ToList();

        // Check for existing disputes with same RelatedId and RelatedType
        var existingIds = await _context.Disputes
            .Where(d => disputes.Any(newD => newD.RelatedId == d.RelatedId && newD.RelatedType == d.RelatedType))
            .Select(d => new { d.RelatedId, d.RelatedType })
            .ToListAsync();

        var newDisputes = disputes
            .Where(d => !existingIds.Any(e => e.RelatedId == d.RelatedId && e.RelatedType == d.RelatedType))
            .ToList();

        if (newDisputes.Count > 0)
        {
            _context.Disputes.AddRange(newDisputes);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created {Count} new disputes via bulk create", newDisputes.Count);
        }

        return Ok(new
        {
            created = newDisputes.Count,
            skipped = disputes.Count - newDisputes.Count,
            total = disputes.Count
        });
    }
}
