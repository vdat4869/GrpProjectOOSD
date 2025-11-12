using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

/// <summary>
/// Thành viên trong nhóm đồng sở hữu
/// </summary>
public class GroupMember
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid VehicleGroupId { get; set; }

    [Required]
    public Guid CoOwnerId { get; set; }

    [Required]
    public MemberRole Role { get; set; } = MemberRole.Member;

    [Required]
    public MemberStatus Status { get; set; } = MemberStatus.Active;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LeftAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(VehicleGroupId))]
    public virtual VehicleGroup? VehicleGroup { get; set; }

    [ForeignKey(nameof(CoOwnerId))]
    public virtual CoOwner? CoOwner { get; set; }
}

public enum MemberRole
{
    Owner = 1,      // Chủ nhóm
    Admin = 2,      // Quản trị viên
    Member = 3      // Thành viên
}

public enum MemberStatus
{
    Active = 1,
    Inactive = 2,
    Removed = 3
}

