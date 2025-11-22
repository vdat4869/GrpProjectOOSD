using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

/// <summary>
/// Dispute/Tranh chấp trong hệ thống
/// </summary>
public class Dispute
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // booking_conflict, payment_issue, cancellation, refund, overdue_payment

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = "medium"; // low, medium, high

    [Required]
    [MaxLength(100)]
    public string RelatedId { get; set; } = string.Empty; // ID của booking, payment, etc.

    [Required]
    [MaxLength(50)]
    public string RelatedType { get; set; } = string.Empty; // booking, payment, cost_share

    [Required]
    [MaxLength(20)]
    public DisputeStatus Status { get; set; } = DisputeStatus.Pending;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string? ResolvedBy { get; set; } // User ID hoặc email của người resolve

    public DateTime? ResolvedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum DisputeStatus
{
    Pending = 1,
    InReview = 2,
    Resolved = 3
}
