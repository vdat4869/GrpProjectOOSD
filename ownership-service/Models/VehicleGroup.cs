using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

/// <summary>
/// Nhóm đồng sở hữu xe
/// </summary>
public class VehicleGroup
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty; // Tên nhóm

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    [MaxLength(50)]
    public string VehicleName { get; set; } = string.Empty; // Tên xe

    [MaxLength(20)]
    public string? LicensePlate { get; set; } // Biển số xe

    [MaxLength(50)]
    public string? VehicleModel { get; set; } // Model xe

    [MaxLength(20)]
    public string? VehicleYear { get; set; } // Năm sản xuất

    public Guid? CreatedByCoOwnerId { get; set; } // Người tạo nhóm (nullable for Admin)

    [Required]
    public GroupStatus Status { get; set; } = GroupStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
    public virtual ICollection<GroupFund> Funds { get; set; } = new List<GroupFund>();
    public virtual ICollection<Proposal> Proposals { get; set; } = new List<Proposal>();
}

public enum GroupStatus
{
    Active = 1,
    Inactive = 2,
    Dissolved = 3
}

