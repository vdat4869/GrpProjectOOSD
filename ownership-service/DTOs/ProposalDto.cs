namespace OwnershipService.DTOs;

public class ProposalDto
{
    public Guid Id { get; set; }
    public Guid VehicleGroupId { get; set; }
    public Guid CreatedByCoOwnerId { get; set; }
    public string CreatedByCoOwnerName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Details { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? Currency { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? VotingStartDate { get; set; }
    public DateTime? VotingEndDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int TotalVotes { get; set; }
    public int ApproveVotes { get; set; }
    public int RejectVotes { get; set; }
    public int AbstainVotes { get; set; }
}

public class CreateProposalDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty; // upgrade_battery, repair, sell_vehicle, insurance_change, etc.
    public string? Details { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? Currency { get; set; }
    public DateTime? VotingStartDate { get; set; }
    public DateTime? VotingEndDate { get; set; }
}

public class VoteDto
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public Guid CoOwnerId { get; set; }
    public string CoOwnerName { get; set; } = string.Empty;
    public string Choice { get; set; } = string.Empty; // Approve, Reject, Abstain
    public string? Comment { get; set; }
    public DateTime VotedAt { get; set; }
}

public class CreateVoteDto
{
    public string Choice { get; set; } = string.Empty; // Approve, Reject, Abstain
    public string? Comment { get; set; }
}

