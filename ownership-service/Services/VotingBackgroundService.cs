using Microsoft.EntityFrameworkCore;
using OwnershipService.Data;
using OwnershipService.Models;
using OwnershipService.Infrastructure;

namespace OwnershipService.Services;

/// <summary>
/// Background service to periodically check and close expired voting proposals
/// </summary>
public class VotingBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<VotingBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1); // Check every 1 minute

    public VotingBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<VotingBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("VotingBackgroundService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndCloseExpiredVotingsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in VotingBackgroundService");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("VotingBackgroundService stopped");
    }

    private async Task CheckAndCloseExpiredVotingsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var rabbitMQService = scope.ServiceProvider.GetService<IRabbitMQService>();
        var httpClientFactory = scope.ServiceProvider.GetService<IHttpClientFactory>();
        var configuration = scope.ServiceProvider.GetService<IConfiguration>();

        // Get all proposals that are in Voting status and have expired
        // Compare using Vietnam time (UTC+7)
        var nowVietnam = TimeZoneHelper.Now;
        var nowUtc = TimeZoneHelper.UtcNow;
        
        // Get all voting proposals and check expiration in memory (since we need timezone conversion)
        var votingProposals = await context.Proposals
            .Include(p => p.VehicleGroup)
            .Where(p => p.Status == ProposalStatus.Voting && p.VotingEndDate.HasValue)
            .ToListAsync(cancellationToken);
        
        var expiredProposals = votingProposals.Where(p =>
        {
            var endDateUtc = p.VotingEndDate!.Value;
            var endDateVietnam = TimeZoneHelper.ToVietnamTime(endDateUtc);
            var isExpired = nowVietnam >= endDateVietnam;
            
            if (isExpired)
            {
                _logger.LogInformation("Found expired proposal {ProposalId}. EndDate UTC: {EndDateUtc}, EndDate Vietnam: {EndDateVietnam}, Now Vietnam: {NowVietnam}", 
                    p.Id, endDateUtc, endDateVietnam, nowVietnam);
            }
            
            return isExpired;
        }).ToList();

        _logger.LogInformation("Checking expired proposals at {Now} (Vietnam time), found {Count} expired out of {Total} voting proposals", 
            nowVietnam, expiredProposals.Count, votingProposals.Count);

        if (!expiredProposals.Any())
        {
            return;
        }

        _logger.LogInformation("Found {Count} expired voting proposals to process", expiredProposals.Count);

        foreach (var proposal in expiredProposals)
        {
            try
            {
                await ProcessExpiredProposalAsync(proposal, context, rabbitMQService, httpClientFactory, configuration, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing expired proposal {ProposalId}", proposal.Id);
            }
        }
    }

    private async Task ProcessExpiredProposalAsync(
        Proposal proposal,
        ApplicationDbContext context,
        IRabbitMQService? rabbitMQService,
        IHttpClientFactory? httpClientFactory,
        IConfiguration? configuration,
        CancellationToken cancellationToken)
    {
        // Get all active members of the vehicle group
        var activeMembers = await context.GroupMembers
            .Where(m => m.VehicleGroupId == proposal.VehicleGroupId && m.Status == MemberStatus.Active)
            .Select(m => m.CoOwnerId)
            .ToListAsync(cancellationToken);

        if (activeMembers.Count == 0)
        {
            _logger.LogWarning("No active members found for vehicle group {VehicleGroupId}", proposal.VehicleGroupId);
            return;
        }

        // Get all votes for this proposal
        List<Vote> votes = new List<Vote>();
        try
        {
            votes = await context.Votes.Where(v => v.ProposalId == proposal.Id).ToListAsync(cancellationToken);
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
            var votesData = await context.Database
                .SqlQueryRaw<VoteRaw>(sql, parameter)
                .ToListAsync(cancellationToken);
            
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

        // Close voting and determine result
        var approveCount = votes.Count(v => v.Choice == VoteChoice.Approve);
        var rejectCount = votes.Count(v => v.Choice == VoteChoice.Reject);
        var totalActiveVotes = votes.Count(v => v.Choice != VoteChoice.Abstain);

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
        await context.SaveChangesAsync(cancellationToken);

        // If approved and has EstimatedCost, create CostShare
        if (proposal.Status == ProposalStatus.Approved && proposal.EstimatedCost.HasValue && proposal.EstimatedCost.Value > 0)
        {
            await CreateCostShareFromProposalAsync(proposal, context, httpClientFactory, configuration, cancellationToken);
        }

        // Publish VotingStatusChanged event
        if (rabbitMQService != null)
        {
            try
            {
                var eventData = new VotingStatusChangedEvent
                {
                    ProposalId = proposal.Id,
                    VehicleGroupId = proposal.VehicleGroupId,
                    ProposalType = proposal.Type.ToString(),
                    Status = proposal.Status.ToString(),
                    UpdatedAt = TimeZoneHelper.UtcNow
                };
                rabbitMQService.PublishEvent("voting.status.changed", eventData);
                _logger.LogInformation("Published VotingStatusChanged event for proposal {ProposalId} with status {Status}", proposal.Id, proposal.Status);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to publish VotingStatusChanged event for proposal {ProposalId}", proposal.Id);
            }
        }
    }

    private async Task CreateCostShareFromProposalAsync(
        Proposal proposal,
        ApplicationDbContext context,
        IHttpClientFactory? httpClientFactory,
        IConfiguration? configuration,
        CancellationToken cancellationToken)
    {
        if (httpClientFactory == null || configuration == null)
        {
            _logger.LogWarning("HttpClientFactory or Configuration not available, cannot create CostShare for proposal {ProposalId}", proposal.Id);
            return;
        }

        try
        {
            // Get active ownerships for the vehicle group to calculate cost share details
            var ownerships = await context.Ownerships
                .Where(o => o.VehicleGroupId == proposal.VehicleGroupId && o.IsActive)
                .ToListAsync(cancellationToken);

            if (!ownerships.Any())
            {
                _logger.LogWarning("No active ownerships found for vehicle group {VehicleGroupId}, cannot create CostShare", proposal.VehicleGroupId);
                return;
            }

            var paymentServiceUrl = configuration["PaymentServiceUrl"] ?? "http://payment-service:80";
            var httpClient = httpClientFactory.CreateClient();

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

            // Use internal endpoint (no auth required for background service)
            var response = await httpClient.PostAsync($"{paymentServiceUrl}/api/costshares/internal", content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to create CostShare for proposal {ProposalId}: {StatusCode} - {Error}", 
                    proposal.Id, response.StatusCode, errorContent);
            }
            else
            {
                var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
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

// Helper class for raw SQL query (same as in VotingController)
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

