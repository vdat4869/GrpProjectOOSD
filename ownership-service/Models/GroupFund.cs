using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

/// <summary>
/// Quỹ nhóm đồng sở hữu
/// </summary>
public class GroupFund
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid VehicleGroupId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // Tên quỹ (ví dụ: "Quỹ bảo dưỡng", "Quỹ chung")

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Balance { get; set; } = 0; // Số dư hiện tại

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "VND";

    [Required]
    public FundStatus Status { get; set; } = FundStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(VehicleGroupId))]
    public virtual VehicleGroup? VehicleGroup { get; set; }

    public virtual ICollection<FundTransaction> Transactions { get; set; } = new List<FundTransaction>();
}

public enum FundStatus
{
    Active = 1,
    Closed = 2
}

