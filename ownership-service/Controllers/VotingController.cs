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
public class VotingController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VotingController> _logger;

    public VotingController(ApplicationDbContext context, ILogger<VotingController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all proposals for a vehicle group
    /// </summary>
    [HttpGet("vehicle-group/{groupId}")]
    public async Task<ActionResult<List<ProposalDto>>> GetProposals(Guid groupId, [FromQuery] string? status = null)
    {
        var query = _context.Proposals
            .Include(p => p.CreatedByCoOwner)
            .Include(p => p.Votes)
            .Where(p => p.VehicleGroupId == groupId)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ProposalStatus>(status, true, out var statusEnum))
        {
            query = query.Where(p => p.Status == statusEnum);
        }

        var proposals = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();

        var result = proposals.Select(p => new ProposalDto
        {
            Id = p.Id,
            VehicleGroupId = p.VehicleGroupId,
            CreatedByCoOwnerId = p.CreatedByCoOwnerId,
            CreatedByCoOwnerName = p.CreatedByCoOwner?.FullName ?? "",
            Title = p.Title,
            Description = p.Description,
            Type = p.Type.ToString(),
            Details = p.Details,
            EstimatedCost = p.EstimatedCost,
            Currency = p.Currency,
            Status = p.Status.ToString(),
            VotingStartDate = p.VotingStartDate,
            VotingEndDate = p.VotingEndDate,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt,
            TotalVotes = p.Votes.Count,
            ApproveVotes = p.Votes.Count(v => v.Choice == VoteChoice.Approve),
            RejectVotes = p.Votes.Count(v => v.Choice == VoteChoice.Reject),
            AbstainVotes = p.Votes.Count(v => v.Choice == VoteChoice.Abstain)
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Get proposal by ID
    /// </summary>
    [HttpGet("proposals/{id}")]
    public async Task<ActionResult<ProposalDto>> GetProposalById(Guid id)
    {
        var proposal = await _context.Proposals
            .Include(p => p.CreatedByCoOwner)
            .Include(p => p.Votes)
            .ThenInclude(v => v.CoOwner)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (proposal == null)
            return NotFound();

        var result = new ProposalDto
        {
            Id = proposal.Id,
            VehicleGroupId = proposal.VehicleGroupId,
            CreatedByCoOwnerId = proposal.CreatedByCoOwnerId,
            CreatedByCoOwnerName = proposal.CreatedByCoOwner?.FullName ?? "",
            Title = proposal.Title,
            Description = proposal.Description,
            Type = proposal.Type.ToString(),
            Details = proposal.Details,
            EstimatedCost = proposal.EstimatedCost,
            Currency = proposal.Currency,
            Status = proposal.Status.ToString(),
            VotingStartDate = proposal.VotingStartDate,
            VotingEndDate = proposal.VotingEndDate,
            CreatedAt = proposal.CreatedAt,
            UpdatedAt = proposal.UpdatedAt,
            TotalVotes = proposal.Votes.Count,
            ApproveVotes = proposal.Votes.Count(v => v.Choice == VoteChoice.Approve),
            RejectVotes = proposal.Votes.Count(v => v.Choice == VoteChoice.Reject),
            AbstainVotes = proposal.Votes.Count(v => v.Choice == VoteChoice.Abstain)
        };

        return Ok(result);
    }

    /// <summary>
    /// Create a new proposal
    /// </summary>
    [HttpPost("vehicle-group/{groupId}")]
    public async Task<ActionResult<ProposalDto>> CreateProposal(Guid groupId, [FromBody] CreateProposalDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var coOwner = await _context.CoOwners.FirstOrDefaultAsync(c => c.UserId == userId);
        if (coOwner == null)
            return BadRequest(new { message = "Co-owner not found" });

        var group = await _context.VehicleGroups.FindAsync(groupId);
        if (group == null)
            return NotFound();

        if (!Enum.TryParse<ProposalType>(dto.Type, true, out var proposalType))
            return BadRequest(new { message = "Invalid proposal type" });

        var proposal = new Proposal
        {
            VehicleGroupId = groupId,
            CreatedByCoOwnerId = coOwner.Id,
            Title = dto.Title,
            Description = dto.Description,
            Type = proposalType,
            Details = dto.Details,
            EstimatedCost = dto.EstimatedCost,
            Currency = dto.Currency ?? "VND",
            Status = ProposalStatus.Pending,
            VotingStartDate = dto.VotingStartDate,
            VotingEndDate = dto.VotingEndDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Proposals.Add(proposal);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProposalById), new { id = proposal.Id }, new ProposalDto
        {
            Id = proposal.Id,
            VehicleGroupId = proposal.VehicleGroupId,
            CreatedByCoOwnerId = proposal.CreatedByCoOwnerId,
            CreatedByCoOwnerName = coOwner.FullName,
            Title = proposal.Title,
            Description = proposal.Description,
            Type = proposal.Type.ToString(),
            Details = proposal.Details,
            EstimatedCost = proposal.EstimatedCost,
            Currency = proposal.Currency,
            Status = proposal.Status.ToString(),
            VotingStartDate = proposal.VotingStartDate,
            VotingEndDate = proposal.VotingEndDate,
            CreatedAt = proposal.CreatedAt,
            UpdatedAt = proposal.UpdatedAt,
            TotalVotes = 0,
            ApproveVotes = 0,
            RejectVotes = 0,
            AbstainVotes = 0
        });
    }

    /// <summary>
    /// Start voting for a proposal
    /// </summary>
    [HttpPost("proposals/{id}/start-voting")]
    public async Task<ActionResult<ProposalDto>> StartVoting(Guid id, [FromBody] StartVotingDto? dto = null)
    {
        var proposal = await _context.Proposals.FindAsync(id);
        if (proposal == null)
            return NotFound();

        if (proposal.Status != ProposalStatus.Pending)
            return BadRequest(new { message = "Proposal is not in pending status" });

        proposal.Status = ProposalStatus.Voting;
        proposal.VotingStartDate = dto?.StartDate ?? DateTime.UtcNow;
        proposal.VotingEndDate = dto?.EndDate ?? DateTime.UtcNow.AddDays(7);
        proposal.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new ProposalDto
        {
            Id = proposal.Id,
            VehicleGroupId = proposal.VehicleGroupId,
            Status = proposal.Status.ToString(),
            VotingStartDate = proposal.VotingStartDate,
            VotingEndDate = proposal.VotingEndDate
        });
    }

    /// <summary>
    /// Vote on a proposal
    /// </summary>
    [HttpPost("proposals/{id}/vote")]
    public async Task<ActionResult<VoteDto>> VoteOnProposal(Guid id, [FromBody] CreateVoteDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var coOwner = await _context.CoOwners.FirstOrDefaultAsync(c => c.UserId == userId);
        if (coOwner == null)
            return BadRequest(new { message = "Co-owner not found" });

        var proposal = await _context.Proposals
            .Include(p => p.VehicleGroup)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (proposal == null)
            return NotFound();

        if (proposal.Status != ProposalStatus.Voting)
            return BadRequest(new { message = "Proposal is not in voting status" });

        // Check if already voted
        var existingVote = await _context.Votes
            .FirstOrDefaultAsync(v => v.ProposalId == id && v.CoOwnerId == coOwner.Id);
        if (existingVote != null)
            return BadRequest(new { message = "You have already voted on this proposal" });

        if (!Enum.TryParse<VoteChoice>(dto.Choice, true, out var choice))
            return BadRequest(new { message = "Invalid vote choice" });

        var vote = new Vote
        {
            ProposalId = id,
            CoOwnerId = coOwner.Id,
            Choice = choice,
            Comment = dto.Comment,
            VotedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _context.Votes.Add(vote);

        // Check if voting period ended and update proposal status
        if (proposal.VotingEndDate.HasValue && DateTime.UtcNow >= proposal.VotingEndDate.Value)
        {
            var votes = await _context.Votes.Where(v => v.ProposalId == id).ToListAsync();
            var approveCount = votes.Count(v => v.Choice == VoteChoice.Approve);
            var rejectCount = votes.Count(v => v.Choice == VoteChoice.Reject);
            var totalActiveVotes = votes.Count(v => v.Choice != VoteChoice.Abstain);

            // Simple majority rule
            if (approveCount > rejectCount && totalActiveVotes > 0)
            {
                proposal.Status = ProposalStatus.Approved;
            }
            else if (rejectCount > approveCount && totalActiveVotes > 0)
            {
                proposal.Status = ProposalStatus.Rejected;
            }
        }

        proposal.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProposalById), new { id }, new VoteDto
        {
            Id = vote.Id,
            ProposalId = vote.ProposalId,
            CoOwnerId = vote.CoOwnerId,
            CoOwnerName = coOwner.FullName,
            Choice = vote.Choice.ToString(),
            Comment = vote.Comment,
            VotedAt = vote.VotedAt
        });
    }

    /// <summary>
    /// Get votes for a proposal
    /// </summary>
    [HttpGet("proposals/{id}/votes")]
    public async Task<ActionResult<List<VoteDto>>> GetProposalVotes(Guid id)
    {
        var votes = await _context.Votes
            .Include(v => v.CoOwner)
            .Where(v => v.ProposalId == id)
            .OrderByDescending(v => v.VotedAt)
            .ToListAsync();

        var result = votes.Select(v => new VoteDto
        {
            Id = v.Id,
            ProposalId = v.ProposalId,
            CoOwnerId = v.CoOwnerId,
            CoOwnerName = v.CoOwner?.FullName ?? "",
            Choice = v.Choice.ToString(),
            Comment = v.Comment,
            VotedAt = v.VotedAt
        }).ToList();

        return Ok(result);
    }
}

public class StartVotingDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

