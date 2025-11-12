using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

public class Ownership
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid CoOwnerId { get; set; }

    [Required]
    public Guid VehicleGroupId { get; set; } // Reference to Group Management Service

    [Required]
    [Column(TypeName = "decimal(5,2)")]
    [Range(0.01, 100.00)]
    public decimal OwnershipPercentage { get; set; } // e.g., 40.00 for 40%

    [Required]
    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; } // NULL if still active

    [Required]
    public bool IsActive { get; set; } = true;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CoOwnerId")]
    public virtual CoOwner CoOwner { get; set; } = null!;
}

