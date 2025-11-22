using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

public class EContract
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid CoOwnerId { get; set; }

    [Required]
    public Guid VehicleGroupId { get; set; }

    [Required]
    [MaxLength(200)]
    public string ContractTitle { get; set; } = string.Empty;

    [Required]
    [MaxLength(5000)]
    public string ContractContent { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "decimal(5,2)")]
    [Range(0.01, 100.00)]
    public decimal OwnershipPercentage { get; set; }

    [Required]
    [MaxLength(50)]
    public string ContractStatus { get; set; } = "Pending"; // Pending, Signed, Rejected, Expired

    public DateTime? SignedAt { get; set; }

    [MaxLength(500)]
    public string? DigitalSignature { get; set; } // Encrypted signature data

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(500)]
    public string? FilePath { get; set; } // Path to stored contract file

    [MaxLength(100)]
    public string? FileName { get; set; } // Original filename

    [MaxLength(50)]
    public string? FileType { get; set; } // MIME type (e.g., "application/pdf", "image/png")

    public long? FileSize { get; set; } // File size in bytes

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresAt { get; set; }

    // Navigation properties
    [ForeignKey("CoOwnerId")]
    public virtual CoOwner CoOwner { get; set; } = null!;
}

