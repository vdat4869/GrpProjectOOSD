using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OwnershipService.DTOs;
using OwnershipService.Data;
using OwnershipService.Models;
using OwnershipService.Services;
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
    private readonly IHttpClientFactory? _httpClientFactory;
    private readonly IConfiguration? _configuration;

    public VotingController(
        ApplicationDbContext context, 
        ILogger<VotingController> logger,
        Infrastructure.IRabbitMQService? rabbitMQService = null,
        IHttpClientFactory? httpClientFactory = null,
        IConfiguration? configuration = null)
    {
        _context = context;
        _logger = logger;
        _rabbitMQService = rabbitMQService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
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

        // Convert Vietnam time (UTC+7) to UTC for storage
        DateTime? votingStartDateUtc = null;
        DateTime? votingEndDateUtc = null;
        
        if (dto.VotingStartDate.HasValue)
        {
            votingStartDateUtc = TimeZoneHelper.ToUtcTime(dto.VotingStartDate.Value);
        }
        
        if (dto.VotingEndDate.HasValue)
        {
            votingEndDateUtc = TimeZoneHelper.ToUtcTime(dto.VotingEndDate.Value);
        }

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
            VotingStartDate = votingStartDateUtc,
            VotingEndDate = votingEndDateUtc,
            CreatedAt = TimeZoneHelper.UtcNow,
            UpdatedAt = TimeZoneHelper.UtcNow
        };
        
        _logger.LogInformation("Creating proposal {ProposalId}. VotingStartDate: {StartDate} (Vietnam) -> {StartDateUtc} (UTC), VotingEndDate: {EndDate} (Vietnam) -> {EndDateUtc} (UTC)", 
            proposal.Id, dto.VotingStartDate, votingStartDateUtc, dto.VotingEndDate, votingEndDateUtc);

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
        proposal.VotingStartDate = dto?.StartDate != null ? TimeZoneHelper.ToUtcTime(dto.StartDate.Value) : TimeZoneHelper.UtcNow;
        
        // Only update VotingEndDate if explicitly provided in dto, otherwise keep existing value
        // If no existing value and no dto value, default to 7 days from now (Vietnam time)
        if (dto?.EndDate.HasValue == true)
        {
            // Frontend sends Vietnam time (UTC+7), convert to UTC for storage
            var endDateVietnam = dto.EndDate.Value;
            proposal.VotingEndDate = TimeZoneHelper.ToUtcTime(endDateVietnam);
            _logger.LogInformation("Setting VotingEndDate for proposal {ProposalId}. Vietnam time: {VietnamTime}, UTC: {UtcTime}", 
                proposal.Id, endDateVietnam, proposal.VotingEndDate);
        }
        else if (!proposal.VotingEndDate.HasValue)
        {
            // Default to 7 days from now in Vietnam time, then convert to UTC
            var defaultEndDateVietnam = TimeZoneHelper.Now.AddDays(7);
            proposal.VotingEndDate = TimeZoneHelper.ToUtcTime(defaultEndDateVietnam);
            _logger.LogInformation("Setting default VotingEndDate for proposal {ProposalId}. Vietnam time: {VietnamTime}, UTC: {UtcTime}", 
                proposal.Id, defaultEndDateVietnam, proposal.VotingEndDate);
        }
        // If proposal already has VotingEndDate and dto doesn't provide one, keep the existing value
        proposal.UpdatedAt = TimeZoneHelper.UtcNow;

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
                    UpdatedAt = TimeZoneHelper.UtcNow
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
            VotedAt = TimeZoneHelper.UtcNow,
            CreatedAt = TimeZoneHelper.UtcNow
        };

        _logger.LogInformation("Creating vote object: ProposalId={ProposalId}, CoOwnerId={CoOwnerId}, Choice={Choice} (Value={ChoiceValue})", 
            id, coOwner.Id, vote.Choice.ToString(), (int)vote.Choice);

        _context.Votes.Add(vote);

        proposal.UpdatedAt = TimeZoneHelper.UtcNow;
        
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

        // Check and close voting if needed (after vote is saved)
        await CheckAndCloseVotingAsync(proposal);

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

    /// <summary>
    /// Manually trigger check and close voting for a specific proposal
    /// </summary>
    [HttpPost("proposals/{id}/check-close")]
    public async Task<ActionResult> CheckAndCloseVoting(Guid id)
    {
        var proposal = await _context.Proposals
            .Include(p => p.VehicleGroup)
            .FirstOrDefaultAsync(p => p.Id == id);
        
        if (proposal == null)
            return NotFound();

        if (proposal.Status != ProposalStatus.Voting)
        {
            return Ok(new { message = $"Proposal is already in {proposal.Status} status", status = proposal.Status.ToString() });
        }

        await CheckAndCloseVotingAsync(proposal);

        // Reload proposal to get updated status
        await _context.Entry(proposal).ReloadAsync();

        return Ok(new { 
            message = "Voting check completed", 
            status = proposal.Status.ToString(),
            votingEndDate = proposal.VotingEndDate,
            currentTime = TimeZoneHelper.Now, // Vietnam time
            currentTimeUtc = TimeZoneHelper.UtcNow
        });
    }

    /// <summary>
    /// Check and close voting if time expired or all members voted
    /// If approved and has EstimatedCost, create CostShare
    /// </summary>
    private async Task CheckAndCloseVotingAsync(Proposal proposal)
    {
        if (proposal.Status != ProposalStatus.Voting)
            return;

        // Get all active members of the vehicle group
        var activeMembers = await _context.GroupMembers
            .Where(m => m.VehicleGroupId == proposal.VehicleGroupId && m.Status == MemberStatus.Active)
            .Select(m => m.CoOwnerId)
            .ToListAsync();

        if (activeMembers.Count == 0)
        {
            _logger.LogWarning("No active members found for vehicle group {VehicleGroupId}", proposal.VehicleGroupId);
            return;
        }

        // Get all votes for this proposal
        List<Vote> votes = new List<Vote>();
        try
        {
            votes = await _context.Votes.Where(v => v.ProposalId == proposal.Id).ToListAsync();
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
            
            var parameter = new Microsoft.Data.SqlClient.SqlParameter("@proposalId", proposal.Id);
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

        // Get unique co-owner IDs who have voted
        var votedCoOwnerIds = votes.Select(v => v.CoOwnerId).Distinct().ToList();
        var allMembersVoted = activeMembers.All(memberId => votedCoOwnerIds.Contains(memberId));

        // Check if voting should be closed
        // Convert VotingEndDate (stored as UTC) to Vietnam time for comparison
        bool shouldClose = false;
        var nowVietnam = TimeZoneHelper.Now;
        var nowUtc = TimeZoneHelper.UtcNow;
        
        if (proposal.VotingEndDate.HasValue)
        {
            // Convert UTC VotingEndDate to Vietnam time
            var endDateUtc = proposal.VotingEndDate.Value;
            var endDateVietnam = TimeZoneHelper.ToVietnamTime(endDateUtc);
            
            _logger.LogInformation("Checking proposal {ProposalId} expiration. EndDate UTC: {EndDateUtc}, EndDate Vietnam: {EndDateVietnam}, Now Vietnam: {NowVietnam}, Now UTC: {NowUtc}", 
                proposal.Id, endDateUtc, endDateVietnam, nowVietnam, nowUtc);
            
            if (nowVietnam >= endDateVietnam)
            {
                shouldClose = true;
                _logger.LogInformation("Voting period ended for proposal {ProposalId}. EndDate: {EndDate} (Vietnam), Current: {Now} (Vietnam)", 
                    proposal.Id, endDateVietnam, nowVietnam);
            }
            else
            {
                _logger.LogDebug("Voting period not ended yet for proposal {ProposalId}. EndDate: {EndDate} (Vietnam), Current: {Now} (Vietnam), Remaining: {Remaining}", 
                    proposal.Id, endDateVietnam, nowVietnam, endDateVietnam - nowVietnam);
            }
        }
        else if (allMembersVoted)
        {
            shouldClose = true;
            _logger.LogInformation("All members have voted for proposal {ProposalId}", proposal.Id);
        }

        if (!shouldClose)
            return;

        // Close voting and determine result
        var approveCount = votes.Count(v => v.Choice == VoteChoice.Approve);
        var rejectCount = votes.Count(v => v.Choice == VoteChoice.Reject);
        var totalActiveVotes = votes.Count(v => v.Choice != VoteChoice.Abstain);

        // Check if all votes are Approve (unanimous approval)
        var allApprove = votes.Count > 0 && votes.All(v => v.Choice == VoteChoice.Approve);

        // Simple majority rule
        if (approveCount > rejectCount && totalActiveVotes > 0)
        {
            proposal.Status = ProposalStatus.Approved;
            _logger.LogInformation("Proposal {ProposalId} approved: {ApproveCount} approve, {RejectCount} reject", 
                proposal.Id, approveCount, rejectCount);
        }
        else if (rejectCount > approveCount && totalActiveVotes > 0)
        {
            proposal.Status = ProposalStatus.Rejected;
            _logger.LogInformation("Proposal {ProposalId} rejected: {ApproveCount} approve, {RejectCount} reject", 
                proposal.Id, approveCount, rejectCount);
        }
        else if (totalActiveVotes == 0)
        {
            // No active votes, consider as rejected
            proposal.Status = ProposalStatus.Rejected;
            _logger.LogInformation("Proposal {ProposalId} rejected: no active votes", proposal.Id);
        }

        proposal.UpdatedAt = TimeZoneHelper.UtcNow;
        await _context.SaveChangesAsync();

        // If approved and has EstimatedCost, create CostShare
        if (proposal.Status == ProposalStatus.Approved && proposal.EstimatedCost.HasValue && proposal.EstimatedCost.Value > 0)
        {
            await CreateCostShareFromProposalAsync(proposal);
        }

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
                    UpdatedAt = TimeZoneHelper.UtcNow
                };
                _rabbitMQService.PublishEvent("voting.status.changed", eventData);
                _logger.LogInformation("Published VotingStatusChanged event for proposal {ProposalId} with status {Status}", proposal.Id, proposal.Status);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to publish VotingStatusChanged event for proposal {ProposalId}", proposal.Id);
            }
        }
    }

    /// <summary>
    /// Create CostShare from approved proposal
    /// </summary>
    private async Task CreateCostShareFromProposalAsync(Proposal proposal)
    {
        if (_httpClientFactory == null || _configuration == null)
        {
            _logger.LogWarning("HttpClientFactory or Configuration not available, cannot create CostShare for proposal {ProposalId}", proposal.Id);
            return;
        }

        try
        {
            // Get active ownerships for the vehicle group to calculate cost share details
            var ownerships = await _context.Ownerships
                .Where(o => o.VehicleGroupId == proposal.VehicleGroupId && o.IsActive)
                .ToListAsync();

            if (!ownerships.Any())
            {
                _logger.LogWarning("No active ownerships found for vehicle group {VehicleGroupId}, cannot create CostShare", proposal.VehicleGroupId);
                return;
            }

            var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://payment-service:80";
            var httpClient = _httpClientFactory.CreateClient();

            // Get authorization token from current request
            var token = Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");
            if (!string.IsNullOrEmpty(token))
            {
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            // Create cost share details based on ownership percentages
            var estimatedCost = proposal.EstimatedCost!.Value; // Already checked before calling this method
            var costShareDetails = ownerships.Select(o => new
            {
                UserId = o.CoOwnerId, // Guid, not string
                OwnershipPercentage = o.OwnershipPercentage,
                Amount = estimatedCost * o.OwnershipPercentage / 100m, // decimal, not double
                Notes = (string?)null
            }).ToList();

            // Determine CostType enum value
            var costType = proposal.Type == ProposalType.Maintenance ? 2 : 99; // 2 = Maintenance, 99 = Other
            
            // Create cost share request with correct types
            var costShareRequest = new
            {
                GroupId = proposal.VehicleGroupId, // Guid, not string
                VehicleId = proposal.VehicleGroupId, // Use GroupId as VehicleId, Guid not string
                CostType = costType, // int (enum value)
                Title = proposal.Title,
                Description = proposal.Description ?? $"Chi phí từ đề xuất: {proposal.Title}",
                TotalAmount = estimatedCost, // decimal, not double
                Currency = proposal.Currency ?? "VND",
                DueDate = TimeZoneHelper.UtcNow.AddDays(30), // DateTime, not string
                ReceiptUrl = (string?)null,
                CostShareDetails = costShareDetails
            };

            var jsonOptions = new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
            };
            var json = System.Text.Json.JsonSerializer.Serialize(costShareRequest, jsonOptions);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            _logger.LogInformation("Creating CostShare for approved proposal {ProposalId}. GroupId: {GroupId}, TotalAmount: {TotalAmount}, DetailsCount: {Count}", 
                proposal.Id, proposal.VehicleGroupId, estimatedCost, costShareDetails.Count);
            _logger.LogDebug("CostShare request JSON: {Json}", json);

            // Try internal endpoint first (no auth required), fallback to regular endpoint
            var response = await httpClient.PostAsync($"{paymentServiceUrl}/api/costshares/internal", content);
            if (!response.IsSuccessStatusCode)
            {
                // Fallback to regular endpoint with auth token
                if (!string.IsNullOrEmpty(token))
                {
                    response = await httpClient.PostAsync($"{paymentServiceUrl}/api/costshares", content);
                }
            }
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to create CostShare for proposal {ProposalId}: {StatusCode} - {Error}", 
                    proposal.Id, response.StatusCode, errorContent);
            }
            else
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Successfully created CostShare for proposal {ProposalId}: {Response}", 
                    proposal.Id, responseContent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating CostShare for proposal {ProposalId}", proposal.Id);
        }
    }
}

public class StartVotingDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

