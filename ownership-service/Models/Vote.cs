using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

/// <summary>
/// Phiếu bầu cho đề xuất
/// </summary>
public class Vote
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid ProposalId { get; set; }

    [Required]
    public Guid CoOwnerId { get; set; } // Người bỏ phiếu

    [Required]
    public VoteChoice Choice { get; set; } // Approve, Reject, Abstain

    [MaxLength(500)]
    public string? Comment { get; set; } // Ý kiến (nếu có)

    public DateTime VotedAt { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(ProposalId))]
    public virtual Proposal? Proposal { get; set; }

    [ForeignKey(nameof(CoOwnerId))]
    public virtual CoOwner? CoOwner { get; set; }
}

public enum VoteChoice
{
    Approve = 1,
    Reject = 2,
    Abstain = 3
}

