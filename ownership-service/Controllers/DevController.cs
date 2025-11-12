using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OwnershipService.Data;
using OwnershipService.Models;
using Microsoft.EntityFrameworkCore;

namespace OwnershipService.Controllers;

[ApiController]
[Route("api/dev")]
[AllowAnonymous]
public class DevController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public DevController(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    [HttpGet("vehiclegroups/create")]
    public async Task<ActionResult<object>> CreateGroup([FromQuery] string? name, [FromQuery] string? description)
    {
        if (!_env.IsDevelopment()) return Forbid();

        var devOwner = await EnsureDevOwnerAsync();

        var group = new VehicleGroup
        {
            Name = string.IsNullOrWhiteSpace(name) ? "Dev Group" : name!,
            Description = description,
            VehicleName = "Dev EV",
            VehicleModel = "DEV-MODEL",
            VehicleYear = DateTime.UtcNow.Year.ToString(),
            LicensePlate = "DEV-0000",
            CreatedByCoOwnerId = devOwner.Id,
            Status = GroupStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.VehicleGroups.Add(group);
        await _context.SaveChangesAsync();
        return Ok(new { id = group.Id, name = group.Name, description = group.Description });
    }

    [HttpGet("coowners/create")]
    public async Task<ActionResult<object>> CreateCoOwner([FromQuery] string? name, [FromQuery] string? email)
    {
        if (!_env.IsDevelopment()) return Forbid();

        var finalEmail = string.IsNullOrWhiteSpace(email)
            ? $"dev-coowner-{Guid.NewGuid():N}@example.com"
            : email!;

        var existing = await _context.CoOwners.FirstOrDefaultAsync(c => c.Email == finalEmail);
        if (existing != null)
        {
            return Ok(new { id = existing.Id, email = existing.Email, name = existing.FullName });
        }

        var coOwner = new CoOwner
        {
            FullName = string.IsNullOrWhiteSpace(name) ? "Dev CoOwner" : name!,
            Email = finalEmail,
            UserId = Guid.NewGuid().ToString(),
            IdentityCardNumber = $"DEVCO-{Guid.NewGuid():N}".Substring(0, 20).ToUpperInvariant(),
            DrivingLicenseNumber = null,
            PhoneNumber = "0000000000",
            Address = "Dev Street",
            IsVerified = true,
            VerifiedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CoOwners.Add(coOwner);
        await _context.SaveChangesAsync();
        return Ok(new { id = coOwner.Id, email = coOwner.Email, name = coOwner.FullName });
    }

    [HttpGet("proposals/create")]
    public async Task<ActionResult<object>> CreateProposal([FromQuery] Guid? groupId, [FromQuery] Guid? coOwnerId, [FromQuery] string? title, [FromQuery] string? description)
    {
        if (!_env.IsDevelopment()) return Forbid();

        var creator = coOwnerId.HasValue
            ? await _context.CoOwners.FirstOrDefaultAsync(c => c.Id == coOwnerId.Value)
            : await EnsureDevOwnerAsync();

        if (creator == null)
        {
            return BadRequest(new { message = "Unable to resolve co-owner to attach the proposal." });
        }

        VehicleGroup? group;
        if (groupId.HasValue)
        {
            group = await _context.VehicleGroups.FirstOrDefaultAsync(g => g.Id == groupId.Value);
            if (group == null) return NotFound(new { message = "Vehicle group not found." });
        }
        else
        {
            group = new VehicleGroup
            {
                Name = $"Dev Group {DateTime.UtcNow:HHmmss}",
                Description = "Auto-generated group for dev proposal",
                VehicleName = "Dev EV",
                VehicleModel = "DEV-MODEL",
                VehicleYear = DateTime.UtcNow.Year.ToString(),
                LicensePlate = $"DEV-{DateTime.UtcNow:HHmmss}",
                CreatedByCoOwnerId = creator.Id,
                Status = GroupStatus.Active,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.VehicleGroups.Add(group);
            await _context.SaveChangesAsync();
        }

        var proposal = new Proposal
        {
            VehicleGroupId = group.Id,
            CreatedByCoOwnerId = creator.Id,
            Title = string.IsNullOrWhiteSpace(title) ? "Dev Maintenance Proposal" : title!,
            Description = description ?? "Auto-generated proposal for smoke testing.",
            Type = ProposalType.Other,
            Details = "{}",
            EstimatedCost = 0,
            Currency = "VND",
            Status = ProposalStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Proposals.Add(proposal);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = proposal.Id,
            groupId = proposal.VehicleGroupId,
            createdBy = proposal.CreatedByCoOwnerId,
            title = proposal.Title,
            status = proposal.Status.ToString()
        });
    }

    private async Task<CoOwner> EnsureDevOwnerAsync()
    {
        var devOwner = await _context.CoOwners.FirstOrDefaultAsync(c => c.Email == "dev-owner@example.com");
        if (devOwner != null) return devOwner;

        devOwner = new CoOwner
        {
            FullName = "Dev Owner",
            Email = "dev-owner@example.com",
            UserId = Guid.NewGuid().ToString(),
            IdentityCardNumber = $"DEV-{Guid.NewGuid():N}".Substring(0, 20).ToUpperInvariant(),
            DrivingLicenseNumber = null,
            PhoneNumber = "0000000000",
            Address = "Dev Street",
            IsVerified = true,
            VerifiedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.CoOwners.Add(devOwner);
        await _context.SaveChangesAsync();
        return devOwner;
    }
}


