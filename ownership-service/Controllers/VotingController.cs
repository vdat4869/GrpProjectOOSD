using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OwnershipService.DTOs;
using OwnershipService.Data;
using OwnershipService.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Collections.Generic;
using System.Linq;
using System.Data;

namespace OwnershipService.Controllers;

// Helper class for raw SQL query
internal class VoteRaw
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public Guid CoOwnerId { get; set; }
    public int Choice { get; set; }
    public string? Comment { get; set; }
    public DateTime VotedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VotingController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VotingController> _logger;
    private readonly Infrastructure.IRabbitMQService? _rabbitMQService;

    public VotingController(
        ApplicationDbContext context, 
        ILogger<VotingController> logger,
        Infrastructure.IRabbitMQService? rabbitMQService = null)
    {
        _context = context;
        _logger = logger;
        _rabbitMQService = rabbitMQService;
    }

    /// <summary>
    /// Get all proposals for a vehicle group
    /// </summary>
    [HttpGet("vehicle-group/{groupId}")]
    public async Task<ActionResult<List<ProposalDto>>> GetProposals(Guid groupId, [FromQuery] string? status = null)
    {
        try
        {
            _logger.LogInformation("Getting proposals for group {GroupId}", groupId);
            
            var query = _context.Proposals
                .Where(p => p.VehicleGroupId == groupId)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<ProposalStatus>(status, true, out var statusEnum))
            {
                query = query.Where(p => p.Status == statusEnum);
            }

            // Load proposals without Include to avoid casting issues
            var proposals = await query
                .Include(p => p.CreatedByCoOwner)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            _logger.LogInformation("Found {Count} proposals for group {GroupId}", proposals.Count, groupId);

            // Load votes separately using raw SQL to handle Boolean to Int conversion
            var proposalIds = proposals.Select(p => p.Id).ToList();
            List<Vote> votes = new List<Vote>();
            
            if (proposalIds.Any())
            {
                try
                {
                    // Try to load votes normally first
                    votes = await _context.Votes
                        .Where(v => proposalIds.Contains(v.ProposalId))
                        .ToListAsync();
                }
                catch (InvalidCastException ex)
                {
                    // If casting fails, use raw SQL with CAST to convert Boolean to Int
                    _logger.LogWarning(ex, "Vote Choice column is Boolean, using raw SQL to convert");
                    
                    // Build parameterized query
                    var placeholders = string.Join(",", proposalIds.Select((_, idx) => $"@p{idx}"));
                    var sql = $@"
                        SELECT 
                            Id, 
                            ProposalId, 
                            CoOwnerId, 
                            CAST(Choice AS INT) as Choice, 
                            Comment, 
                            VotedAt, 
                            CreatedAt
                        FROM Votes 
                        WHERE ProposalId IN ({placeholders})";
                    
                    // Create parameters
                    var parameters = proposalIds.Select((id, idx) => 
                        new Microsoft.Data.SqlClient.SqlParameter($"@p{idx}", id)).ToArray();
                    
                    // Execute raw SQL query
                    var votesData = await _context.Database
                        .SqlQueryRaw<VoteRaw>(sql, parameters)
                        .ToListAsync();
                    
                    // Convert raw data to Vote entities
                    votes = votesData.Select(v => new Vote
                    {
                        Id = v.Id,
                        ProposalId = v.ProposalId,
                        CoOwnerId = v.CoOwnerId,
                        Choice = (VoteChoice)v.Choice,
                        Comment = v.Comment,
                        VotedAt = v.VotedAt,
                        CreatedAt = v.CreatedAt
                    }).ToList();
                }
            }

            var votesByProposal = votes.GroupBy(v => v.ProposalId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var result = new List<ProposalDto>();
            foreach (var p in proposals)
            {
                try
                {
                    var proposalVotes = votesByProposal.GetValueOrDefault(p.Id) ?? new List<Vote>();
                    result.Add(new ProposalDto
                    {
                        Id = p.Id,
                        VehicleGroupId = p.VehicleGroupId,
                        CreatedByCoOwnerId = p.CreatedByCoOwnerId,
                        CreatedByCoOwnerName = p.CreatedByCoOwner?.FullName ?? "",
                        Title = p.Title ?? "",
                        Description = p.Description,
                        Type = p.Type.ToString(),
                        Details = p.Details,
                        EstimatedCost = p.EstimatedCost,
                        Currency = p.Currency ?? "VND",
                        Status = p.Status.ToString(),
                        VotingStartDate = p.VotingStartDate,
                        VotingEndDate = p.VotingEndDate,
                        CreatedAt = p.CreatedAt,
                        UpdatedAt = p.UpdatedAt,
                        TotalVotes = proposalVotes.Count,
                        ApproveVotes = proposalVotes.Count(v => v.Choice == VoteChoice.Approve),
                        RejectVotes = proposalVotes.Count(v => v.Choice == VoteChoice.Reject),
                        AbstainVotes = proposalVotes.Count(v => v.Choice == VoteChoice.Abstain)
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error mapping proposal {ProposalId}", p.Id);
                    // Continue with other proposals
                }
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting proposals for group {GroupId}: {Message}", groupId, ex.Message);
            _logger.LogError(ex, "Stack trace: {StackTrace}", ex.StackTrace);
            return StatusCode(500, new { message = "An error occurred while retrieving proposals", error = ex.Message });
        }
    }

    /// <summary>
    /// Get proposal by ID
    /// </summary>
    [HttpGet("proposals/{id}")]
    public async Task<ActionResult<ProposalDto>> GetProposalById(Guid id)
    {
        try
        {
            var proposal = await _context.Proposals
                .Include(p => p.CreatedByCoOwner)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (proposal == null)
                return NotFound();

            // Load votes separately to avoid casting issues
            List<Vote> votes = new List<Vote>();
            try
            {
                votes = await _context.Votes
                    .Where(v => v.ProposalId == id)
                    .ToListAsync();
            }
            catch (InvalidCastException ex)
            {
                _logger.LogWarning(ex, "Vote Choice column is Boolean, using raw SQL to convert");
                var sql = @"
                    SELECT 
                        Id, 
                        ProposalId, 
                        CoOwnerId, 
                        CAST(Choice AS INT) as Choice, 
                        Comment, 
                        VotedAt, 
                        CreatedAt
                    FROM Votes 
                    WHERE ProposalId = @proposalId";
                
                var parameter = new Microsoft.Data.SqlClient.SqlParameter("@proposalId", id);
                var votesData = await _context.Database
                    .SqlQueryRaw<VoteRaw>(sql, parameter)
                    .ToListAsync();
                
                votes = votesData.Select(v => new Vote
                {
                    Id = v.Id,
                    ProposalId = v.ProposalId,
                    CoOwnerId = v.CoOwnerId,
                    Choice = (VoteChoice)v.Choice,
                    Comment = v.Comment,
                    VotedAt = v.VotedAt,
                    CreatedAt = v.CreatedAt
                }).ToList();
            }

            var result = new ProposalDto
            {
                Id = proposal.Id,
                VehicleGroupId = proposal.VehicleGroupId,
                CreatedByCoOwnerId = proposal.CreatedByCoOwnerId,
                CreatedByCoOwnerName = proposal.CreatedByCoOwner?.FullName ?? "",
                Title = proposal.Title ?? "",
                Description = proposal.Description,
                Type = proposal.Type.ToString(),
                Details = proposal.Details,
                EstimatedCost = proposal.EstimatedCost,
                Currency = proposal.Currency ?? "VND",
                Status = proposal.Status.ToString(),
                VotingStartDate = proposal.VotingStartDate,
                VotingEndDate = proposal.VotingEndDate,
                CreatedAt = proposal.CreatedAt,
                UpdatedAt = proposal.UpdatedAt,
                TotalVotes = votes.Count,
                ApproveVotes = votes.Count(v => v.Choice == VoteChoice.Approve),
                RejectVotes = votes.Count(v => v.Choice == VoteChoice.Reject),
                AbstainVotes = votes.Count(v => v.Choice == VoteChoice.Abstain)
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting proposal {ProposalId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving proposal", error = ex.Message });
        }
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

        // Map string type to enum (handle snake_case to PascalCase conversion)
        var typeString = dto.Type.ToLower().Replace("_", "");
        ProposalType proposalType;
        
        if (typeString == "upgradebattery" || typeString == "upgrade_battery")
            proposalType = ProposalType.UpgradeBattery;
        else if (typeString == "repair")
            proposalType = ProposalType.Repair;
        else if (typeString == "sellvehicle" || typeString == "sell_vehicle")
            proposalType = ProposalType.SellVehicle;
        else if (typeString == "insurancechange" || typeString == "insurance_change")
            proposalType = ProposalType.InsuranceChange;
        else if (typeString == "maintenance")
            proposalType = ProposalType.Maintenance;
        else if (typeString == "other")
            proposalType = ProposalType.Other;
        else if (!Enum.TryParse<ProposalType>(dto.Type, true, out proposalType))
            return BadRequest(new { message = $"Invalid proposal type: {dto.Type}" });

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

        // Publish VotingStatusChanged event
        if (_rabbitMQService != null)
        {
            try
            {
                var eventData = new Infrastructure.VotingStatusChangedEvent
                {
                    ProposalId = proposal.Id,
                    VehicleGroupId = proposal.VehicleGroupId,
                    ProposalType = proposal.Type.ToString(),
                    Status = proposal.Status.ToString(),
                    UpdatedAt = DateTime.UtcNow
                };
                _rabbitMQService.PublishEvent("voting.status.changed", eventData);
                _logger.LogInformation("Published VotingStatusChanged event for proposal {ProposalId}", proposal.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to publish VotingStatusChanged event for proposal {ProposalId}", proposal.Id);
            }
        }

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
        _logger.LogInformation("VoteOnProposal called: ProposalId={ProposalId}, Choice={Choice}, Comment={Comment}", 
            id, dto.Choice, dto.Comment ?? "none");
        
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("VoteOnProposal: Unauthorized - no userId");
            return Unauthorized();
        }

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
        Vote? existingVote = null;
        try
        {
            existingVote = await _context.Votes
                .FirstOrDefaultAsync(v => v.ProposalId == id && v.CoOwnerId == coOwner.Id);
        }
        catch (InvalidCastException ex)
        {
            _logger.LogWarning(ex, "Vote Choice column is Boolean, using raw SQL to check existing vote");
            var sql = @"
                SELECT TOP(1)
                    Id, 
                    ProposalId, 
                    CoOwnerId, 
                    CAST(Choice AS INT) as Choice, 
                    Comment, 
                    VotedAt, 
                    CreatedAt
                FROM Votes 
                WHERE ProposalId = @proposalId AND CoOwnerId = @coOwnerId";
            
            var parameters = new[]
            {
                new Microsoft.Data.SqlClient.SqlParameter("@proposalId", id),
                new Microsoft.Data.SqlClient.SqlParameter("@coOwnerId", coOwner.Id)
            };
            
            var voteData = await _context.Database
                .SqlQueryRaw<VoteRaw>(sql, parameters)
                .FirstOrDefaultAsync();
            
            if (voteData != null)
            {
                existingVote = new Vote
                {
                    Id = voteData.Id,
                    ProposalId = voteData.ProposalId,
                    CoOwnerId = voteData.CoOwnerId,
                    Choice = (VoteChoice)voteData.Choice,
                    Comment = voteData.Comment,
                    VotedAt = voteData.VotedAt,
                    CreatedAt = voteData.CreatedAt
                };
            }
        }
        
        if (existingVote != null)
            return BadRequest(new { message = "You have already voted on this proposal" });

        if (!Enum.TryParse<VoteChoice>(dto.Choice, true, out var choice))
        {
            _logger.LogWarning("Invalid vote choice: {Choice}", dto.Choice);
            return BadRequest(new { message = "Invalid vote choice" });
        }

        _logger.LogInformation("Parsed vote choice: {Choice} (Value={ChoiceValue})", dto.Choice, (int)choice);

        // Save vote - Choice column should be INT (migration script will handle conversion)
        var vote = new Vote
        {
            ProposalId = id,
            CoOwnerId = coOwner.Id,
            Choice = choice,
            Comment = dto.Comment,
            VotedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _logger.LogInformation("Creating vote object: ProposalId={ProposalId}, CoOwnerId={CoOwnerId}, Choice={Choice} (Value={ChoiceValue})", 
            id, coOwner.Id, vote.Choice.ToString(), (int)vote.Choice);

        _context.Votes.Add(vote);

        // Check if voting period ended and update proposal status
        if (proposal.VotingEndDate.HasValue && DateTime.UtcNow >= proposal.VotingEndDate.Value)
        {
            List<Vote> votes = new List<Vote>();
            try
            {
                votes = await _context.Votes.Where(v => v.ProposalId == id).ToListAsync();
            }
            catch (InvalidCastException ex)
            {
                _logger.LogWarning(ex, "Vote Choice column is Boolean, using raw SQL to convert");
                var sql = @"
                    SELECT 
                        Id, 
                        ProposalId, 
                        CoOwnerId, 
                        CAST(Choice AS INT) as Choice, 
                        Comment, 
                        VotedAt, 
                        CreatedAt
                    FROM Votes 
                    WHERE ProposalId = @proposalId";
                
                var parameter = new Microsoft.Data.SqlClient.SqlParameter("@proposalId", id);
                var votesData = await _context.Database
                    .SqlQueryRaw<VoteRaw>(sql, parameter)
                    .ToListAsync();
                
                votes = votesData.Select(v => new Vote
                {
                    Id = v.Id,
                    ProposalId = v.ProposalId,
                    CoOwnerId = v.CoOwnerId,
                    Choice = (VoteChoice)v.Choice,
                    Comment = v.Comment,
                    VotedAt = v.VotedAt,
                    CreatedAt = v.CreatedAt
                }).ToList();
            }
            
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
        
        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Vote saved successfully: ProposalId={ProposalId}, CoOwnerId={CoOwnerId}, Choice={Choice} (Value={ChoiceValue}), VoteId={VoteId}", 
                id, coOwner.Id, vote.Choice.ToString(), (int)vote.Choice, vote.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save vote: ProposalId={ProposalId}, CoOwnerId={CoOwnerId}, Choice={Choice} (Value={ChoiceValue})", 
                id, coOwner.Id, vote.Choice.ToString(), (int)vote.Choice);
            return StatusCode(500, new { message = "Failed to save vote", error = ex.Message });
        }

        // Publish VotingStatusChanged event if status changed
        if (_rabbitMQService != null && (proposal.Status == ProposalStatus.Approved || proposal.Status == ProposalStatus.Rejected))
        {
            try
            {
                var eventData = new Infrastructure.VotingStatusChangedEvent
                {
                    ProposalId = proposal.Id,
                    VehicleGroupId = proposal.VehicleGroupId,
                    ProposalType = proposal.Type.ToString(),
                    Status = proposal.Status.ToString(),
                    UpdatedAt = DateTime.UtcNow
                };
                _rabbitMQService.PublishEvent("voting.status.changed", eventData);
                _logger.LogInformation("Published VotingStatusChanged event for proposal {ProposalId} with status {Status}", proposal.Id, proposal.Status);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to publish VotingStatusChanged event for proposal {ProposalId}", proposal.Id);
            }
        }

        // Log the vote choice for debugging
        _logger.LogInformation("Vote saved: ProposalId={ProposalId}, CoOwnerId={CoOwnerId}, Choice={Choice} (Value={ChoiceValue})", 
            id, coOwner.Id, vote.Choice.ToString(), (int)vote.Choice);

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
        try
        {
            // Always use raw SQL to read votes to avoid casting issues
            // Even though schema is INT, EF Core might cache old schema
            List<Vote> votes = new List<Vote>();
            
            var sql = @"
                SELECT 
                    v.Id, 
                    v.ProposalId, 
                    v.CoOwnerId, 
                    CAST(v.Choice AS INT) as Choice, 
                    v.Comment, 
                    v.VotedAt, 
                    v.CreatedAt
                FROM Votes v
                WHERE v.ProposalId = @proposalId
                ORDER BY v.VotedAt DESC";
            
            var parameter = new Microsoft.Data.SqlClient.SqlParameter("@proposalId", id);
            var votesData = await _context.Database
                .SqlQueryRaw<VoteRaw>(sql, parameter)
                .ToListAsync();
            
            votes = votesData.Select(v => new Vote
            {
                Id = v.Id,
                ProposalId = v.ProposalId,
                CoOwnerId = v.CoOwnerId,
                Choice = (VoteChoice)v.Choice,
                Comment = v.Comment,
                VotedAt = v.VotedAt,
                CreatedAt = v.CreatedAt
            }).ToList();
            
            _logger.LogInformation("Loaded {Count} votes for proposal {ProposalId} using raw SQL", votes.Count, id);

            // Load CoOwners separately
            var coOwnerIds = votes.Select(v => v.CoOwnerId).Distinct().ToList();
            var coOwners = await _context.CoOwners
                .Where(c => coOwnerIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c);

            var result = votes.Select(v => new VoteDto
            {
                Id = v.Id,
                ProposalId = v.ProposalId,
                CoOwnerId = v.CoOwnerId,
                CoOwnerName = coOwners.GetValueOrDefault(v.CoOwnerId)?.FullName ?? "",
                Choice = v.Choice.ToString(),
                Comment = v.Comment,
                VotedAt = v.VotedAt
            }).ToList();

            // Log votes for debugging with choice value
            foreach (var voteDto in result)
            {
                var vote = votes.FirstOrDefault(v => v.Id == voteDto.Id);
                var choiceValue = vote != null ? (int)vote.Choice : -1;
                _logger.LogInformation("Returning vote: ProposalId={ProposalId}, CoOwnerId={CoOwnerId}, Choice={Choice} (Value={ChoiceValue})", 
                    voteDto.ProposalId, voteDto.CoOwnerId, voteDto.Choice, choiceValue);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting votes for proposal {ProposalId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving votes", error = ex.Message });
        }
    }
}

public class StartVotingDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

