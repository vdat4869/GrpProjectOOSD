using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OwnershipService.DTOs;
using OwnershipService.Data;
using OwnershipService.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace OwnershipService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehicleGroupsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VehicleGroupsController> _logger;
    private readonly IWebHostEnvironment _env;

    public VehicleGroupsController(ApplicationDbContext context, ILogger<VehicleGroupsController> logger, IWebHostEnvironment env)
    {
        _context = context;
        _logger = logger;
        _env = env;
    }

    /// <summary>
    /// Get all vehicle groups
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<VehicleGroupDto>>> GetAllVehicleGroups([FromQuery] string? status = null)
    {
        var query = _context.VehicleGroups.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<GroupStatus>(status, true, out var statusEnum))
        {
            query = query.Where(vg => vg.Status == statusEnum);
        }

        var groups = await query
            .Include(vg => vg.Members)
            .Include(vg => vg.Funds)
            .ToListAsync();

        var result = groups.Select(vg => new VehicleGroupDto
        {
            Id = vg.Id,
            Name = vg.Name,
            Description = vg.Description,
            VehicleName = vg.VehicleName,
            LicensePlate = vg.LicensePlate,
            VehicleModel = vg.VehicleModel,
            VehicleYear = vg.VehicleYear,
            CreatedByCoOwnerId = vg.CreatedByCoOwnerId,
            Status = vg.Status.ToString(),
            CreatedAt = vg.CreatedAt,
            UpdatedAt = vg.UpdatedAt,
            MemberCount = vg.Members.Count(m => m.Status == MemberStatus.Active),
            TotalFundBalance = vg.Funds.Where(f => f.Status == FundStatus.Active).Sum(f => f.Balance)
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Get vehicle group by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<VehicleGroupDto>> GetVehicleGroupById(Guid id)
    {
        var group = await _context.VehicleGroups
            .Include(vg => vg.Members)
            .ThenInclude(m => m.CoOwner)
            .Include(vg => vg.Funds)
            .FirstOrDefaultAsync(vg => vg.Id == id);

        if (group == null)
            return NotFound();

        var result = new VehicleGroupDto
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            VehicleName = group.VehicleName,
            LicensePlate = group.LicensePlate,
            VehicleModel = group.VehicleModel,
            VehicleYear = group.VehicleYear,
            CreatedByCoOwnerId = group.CreatedByCoOwnerId,
            Status = group.Status.ToString(),
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt,
            MemberCount = group.Members.Count(m => m.Status == MemberStatus.Active),
            TotalFundBalance = group.Funds.Where(f => f.Status == FundStatus.Active).Sum(f => f.Balance)
        };

        return Ok(result);
    }

    /// <summary>
    /// Create a new vehicle group
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<VehicleGroupDto>> CreateVehicleGroup([FromBody] CreateVehicleGroupDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Check if user is Admin
        var isAdmin = User.IsInRole("Admin") || 
                     User.Claims.Any(c => c.Type == ClaimTypes.Role && (c.Value == "Admin" || c.Value == "admin"));

        // Find co-owner by userId
        var coOwner = await _context.CoOwners.FirstOrDefaultAsync(c => c.UserId == userId);
        
        // If not admin and no co-owner found, return error
        if (!isAdmin && coOwner == null)
            return BadRequest(new { message = "Co-owner not found" });

        var group = new VehicleGroup
        {
            Name = dto.Name,
            Description = dto.Description,
            VehicleName = dto.VehicleName,
            LicensePlate = dto.LicensePlate,
            VehicleModel = dto.VehicleModel,
            VehicleYear = dto.VehicleYear,
            CreatedByCoOwnerId = coOwner?.Id, // Allow null for Admin
            Status = GroupStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.VehicleGroups.Add(group);
        await _context.SaveChangesAsync();

        // Add creator as Owner member only if co-owner exists
        if (coOwner != null)
        {
            var member = new GroupMember
            {
                VehicleGroupId = group.Id,
                CoOwnerId = coOwner.Id,
                Role = MemberRole.Owner,
                Status = MemberStatus.Active,
                JoinedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.GroupMembers.Add(member);
            await _context.SaveChangesAsync();
        }

        var memberCount = coOwner != null ? 1 : 0;
        var result = new VehicleGroupDto
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            VehicleName = group.VehicleName,
            LicensePlate = group.LicensePlate,
            VehicleModel = group.VehicleModel,
            VehicleYear = group.VehicleYear,
            CreatedByCoOwnerId = group.CreatedByCoOwnerId,
            Status = group.Status.ToString(),
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt,
            MemberCount = memberCount,
            TotalFundBalance = 0
        };

        return CreatedAtAction(nameof(GetVehicleGroupById), new { id = group.Id }, result);
    }

    /// <summary>
    /// Update vehicle group
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<VehicleGroupDto>> UpdateVehicleGroup(Guid id, [FromBody] UpdateVehicleGroupDto dto)
    {
        var group = await _context.VehicleGroups.FindAsync(id);
        if (group == null)
            return NotFound();

        if (!string.IsNullOrEmpty(dto.Name))
            group.Name = dto.Name;
        if (dto.Description != null)
            group.Description = dto.Description;
        if (!string.IsNullOrEmpty(dto.VehicleName))
            group.VehicleName = dto.VehicleName;
        if (dto.LicensePlate != null)
            group.LicensePlate = dto.LicensePlate;
        if (dto.VehicleModel != null)
            group.VehicleModel = dto.VehicleModel;
        if (dto.VehicleYear != null)
            group.VehicleYear = dto.VehicleYear;
        if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<GroupStatus>(dto.Status, true, out var status))
            group.Status = status;

        group.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new VehicleGroupDto
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            VehicleName = group.VehicleName,
            LicensePlate = group.LicensePlate,
            VehicleModel = group.VehicleModel,
            VehicleYear = group.VehicleYear,
            CreatedByCoOwnerId = group.CreatedByCoOwnerId,
            Status = group.Status.ToString(),
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt
        });
    }

    /// <summary>
    /// Get members of a vehicle group
    /// </summary>
    [HttpGet("{id}/members")]
    public async Task<ActionResult<List<GroupMemberDto>>> GetGroupMembers(Guid id)
    {
        var members = await _context.GroupMembers
            .Include(m => m.CoOwner)
            .Where(m => m.VehicleGroupId == id && m.Status == MemberStatus.Active)
            .ToListAsync();

        var result = members.Select(m => new GroupMemberDto
        {
            Id = m.Id,
            VehicleGroupId = m.VehicleGroupId,
            CoOwnerId = m.CoOwnerId,
            CoOwnerName = m.CoOwner?.FullName ?? "",
            CoOwnerEmail = m.CoOwner?.Email ?? "",
            Role = m.Role.ToString(),
            Status = m.Status.ToString(),
            JoinedAt = m.JoinedAt,
            LeftAt = m.LeftAt
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Add member to vehicle group
    /// </summary>
    [HttpPost("{id}/members")]
    public async Task<ActionResult<GroupMemberDto>> AddGroupMember(Guid id, [FromBody] AddGroupMemberDto dto)
    {
        var group = await _context.VehicleGroups.FindAsync(id);
        if (group == null)
            return NotFound();

        var coOwner = await _context.CoOwners.FindAsync(dto.CoOwnerId);
        if (coOwner == null)
            return BadRequest(new { message = "Co-owner not found" });

        // Check if already a member
        var existing = await _context.GroupMembers
            .FirstOrDefaultAsync(m => m.VehicleGroupId == id && m.CoOwnerId == dto.CoOwnerId);
        if (existing != null)
        {
            if (existing.Status == MemberStatus.Active)
                return BadRequest(new { message = "Member already exists" });
            // Reactivate
            existing.Status = MemberStatus.Active;
            existing.LeftAt = null;
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new GroupMemberDto
            {
                Id = existing.Id,
                VehicleGroupId = existing.VehicleGroupId,
                CoOwnerId = existing.CoOwnerId,
                CoOwnerName = coOwner.FullName,
                CoOwnerEmail = coOwner.Email,
                Role = existing.Role.ToString(),
                Status = existing.Status.ToString(),
                JoinedAt = existing.JoinedAt
            });
        }

        if (!Enum.TryParse<MemberRole>(dto.Role, true, out var role))
            role = MemberRole.Member;

        var member = new GroupMember
        {
            VehicleGroupId = id,
            CoOwnerId = dto.CoOwnerId,
            Role = role,
            Status = MemberStatus.Active,
            JoinedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.GroupMembers.Add(member);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGroupMembers), new { id }, new GroupMemberDto
        {
            Id = member.Id,
            VehicleGroupId = member.VehicleGroupId,
            CoOwnerId = member.CoOwnerId,
            CoOwnerName = coOwner.FullName,
            CoOwnerEmail = coOwner.Email,
            Role = member.Role.ToString(),
            Status = member.Status.ToString(),
            JoinedAt = member.JoinedAt
        });
    }

    /// <summary>
    /// Remove member from vehicle group
    /// </summary>
    [HttpDelete("{groupId}/members/{memberId}")]
    public async Task<IActionResult> RemoveGroupMember(Guid groupId, Guid memberId)
    {
        var member = await _context.GroupMembers
            .FirstOrDefaultAsync(m => m.Id == memberId && m.VehicleGroupId == groupId);
        if (member == null)
            return NotFound();

        member.Status = MemberStatus.Removed;
        member.LeftAt = DateTime.UtcNow;
        member.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Update group member role (phân quyền nhóm)
    /// </summary>
    [HttpPut("{groupId}/members/{memberId}/role")]
    public async Task<ActionResult<GroupMemberDto>> UpdateGroupMemberRole(Guid groupId, Guid memberId, [FromBody] UpdateGroupMemberDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var member = await _context.GroupMembers
            .Include(m => m.CoOwner)
            .Include(m => m.VehicleGroup)
            .FirstOrDefaultAsync(m => m.Id == memberId && m.VehicleGroupId == groupId);
        if (member == null)
            return NotFound();

        // Check if user has permission to update role (Owner or Admin of the group)
        var currentUserCoOwner = await _context.CoOwners.FirstOrDefaultAsync(c => c.UserId == userId);
        if (currentUserCoOwner == null)
            return Unauthorized();

        var currentUserMember = await _context.GroupMembers
            .FirstOrDefaultAsync(m => m.VehicleGroupId == groupId && 
                                      m.CoOwnerId == currentUserCoOwner.Id && 
                                      m.Status == MemberStatus.Active);
        
        if (currentUserMember == null || (currentUserMember.Role != MemberRole.Owner && currentUserMember.Role != MemberRole.Admin))
        {
            return Forbid("Only Owner or Admin can update member roles");
        }

        // Prevent changing Owner role or removing the last Owner
        if (member.Role == MemberRole.Owner && dto.Role != null && dto.Role != "Owner")
        {
            var ownerCount = await _context.GroupMembers
                .CountAsync(m => m.VehicleGroupId == groupId && 
                                m.Role == MemberRole.Owner && 
                                m.Status == MemberStatus.Active);
            if (ownerCount <= 1)
            {
                return BadRequest(new { message = "Cannot change role of the last Owner" });
            }
        }

        // Update role if provided
        if (!string.IsNullOrEmpty(dto.Role) && Enum.TryParse<MemberRole>(dto.Role, true, out var newRole))
        {
            member.Role = newRole;
        }

        // Update status if provided
        if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<MemberStatus>(dto.Status, true, out var newStatus))
        {
            member.Status = newStatus;
            if (newStatus == MemberStatus.Removed)
            {
                member.LeftAt = DateTime.UtcNow;
            }
        }

        member.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new GroupMemberDto
        {
            Id = member.Id,
            VehicleGroupId = member.VehicleGroupId,
            CoOwnerId = member.CoOwnerId,
            CoOwnerName = member.CoOwner?.FullName ?? "",
            CoOwnerEmail = member.CoOwner?.Email ?? "",
            Role = member.Role.ToString(),
            Status = member.Status.ToString(),
            JoinedAt = member.JoinedAt,
            LeftAt = member.LeftAt
        });
    }

    /// <summary>
    /// Update vehicle group status only
    /// </summary>
    [HttpPatch("{id}/status")]
    public async Task<ActionResult<VehicleGroupDto>> UpdateVehicleGroupStatus(Guid id, [FromBody] UpdateVehicleGroupStatusDto dto)
    {
        var group = await _context.VehicleGroups.FindAsync(id);
        if (group == null)
            return NotFound();

        if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<GroupStatus>(dto.Status, true, out var status))
        {
            group.Status = status;
            group.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Updated vehicle group {GroupId} status to {Status}", id, status);
        }

        return Ok(new VehicleGroupDto
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            VehicleName = group.VehicleName,
            LicensePlate = group.LicensePlate,
            VehicleModel = group.VehicleModel,
            VehicleYear = group.VehicleYear,
            CreatedByCoOwnerId = group.CreatedByCoOwnerId,
            Status = group.Status.ToString(),
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt
        });
    }

    /// <summary>
    /// Delete vehicle group (Admin/Staff only)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> DeleteVehicleGroup(Guid id)
    {
        var group = await _context.VehicleGroups
            .Include(vg => vg.Members)
            .Include(vg => vg.Funds)
            .Include(vg => vg.Proposals)
            .FirstOrDefaultAsync(vg => vg.Id == id);
        
        if (group == null)
            return NotFound();

        // Check if group has active members or funds
        var hasActiveMembers = group.Members.Any(m => m.Status == MemberStatus.Active);
        var hasActiveFunds = group.Funds.Any(f => f.Status == FundStatus.Active);
        
        if (hasActiveMembers || hasActiveFunds)
        {
            // Soft delete: mark as Dissolved instead of hard delete
            group.Status = GroupStatus.Dissolved;
            group.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Soft deleted vehicle group {GroupId} (marked as Dissolved)", id);
            return Ok(new { message = "Group marked as Dissolved due to active members or funds" });
        }

        // Hard delete if no active members or funds
        _context.VehicleGroups.Remove(group);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Hard deleted vehicle group {GroupId}", id);
        return NoContent();
    }

    // Dev-only: create minimal group without auth to unblock smoke tests
    [HttpPost("dev-create")]
    [AllowAnonymous]
    public async Task<ActionResult<VehicleGroupDto>> DevCreate([FromBody] CreateVehicleGroupDto dto)
    {
        if (!_env.IsDevelopment()) return Forbid();

        // Fallback: accept query/form when JSON body cannot be parsed (to bypass shell escaping issues)
        if (dto == null)
        {
            var nameValue = Request.HasFormContentType 
                ? Request.Form["name"].FirstOrDefault() ?? Request.Form["Name"].FirstOrDefault() 
                : Request.Query["name"].FirstOrDefault() ?? Request.Query["Name"].FirstOrDefault();
            var descriptionValue = Request.HasFormContentType 
                ? Request.Form["description"].FirstOrDefault() ?? Request.Form["Description"].FirstOrDefault() 
                : Request.Query["description"].FirstOrDefault() ?? Request.Query["Description"].FirstOrDefault();
            
            dto = new CreateVehicleGroupDto
            {
                Name = nameValue ?? string.Empty,
                Description = descriptionValue
            };
        }
        var group = new VehicleGroup
        {
            Name = dto.Name ?? "Dev Group",
            Description = dto.Description,
            Status = GroupStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.VehicleGroups.Add(group);
        await _context.SaveChangesAsync();

        return Ok(new VehicleGroupDto
        {
            Id = group.Id,
            Name = group.Name,
            Description = group.Description,
            Status = group.Status.ToString(),
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt
        });
    }

    // Dev-only GET variant to avoid body requirements
    [HttpGet("dev-create")]
    [AllowAnonymous]
    public async Task<ActionResult<VehicleGroupDto>> DevCreateGet([FromQuery] string? name, [FromQuery] string? description)
    {
        if (!_env.IsDevelopment()) return Forbid();
        var dto = new CreateVehicleGroupDto { Name = name ?? string.Empty, Description = description };
        return await DevCreate(dto);
    }
}

