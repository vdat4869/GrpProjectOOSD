using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

/// <summary>
/// Đề xuất/quyết định nhóm (nâng cấp pin, sửa chữa, bán xe, v.v.)
/// </summary>
public class Proposal
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid VehicleGroupId { get; set; }

    [Required]
    public Guid CreatedByCoOwnerId { get; set; } // Người tạo đề xuất

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required]
    public ProposalType Type { get; set; } // "upgrade_battery", "repair", "sell_vehicle", "insurance_change", etc.

    [MaxLength(1000)]
    public string? Details { get; set; } // JSON hoặc text chi tiết

    [Column(TypeName = "decimal(18,2)")]
    public decimal? EstimatedCost { get; set; } // Chi phí ước tính

    [MaxLength(3)]
    public string? Currency { get; set; } = "VND";

    [Required]
    public ProposalStatus Status { get; set; } = ProposalStatus.Pending;

    public DateTime? VotingStartDate { get; set; }

    public DateTime? VotingEndDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(VehicleGroupId))]
    public virtual VehicleGroup? VehicleGroup { get; set; }

    [ForeignKey(nameof(CreatedByCoOwnerId))]
    public virtual CoOwner? CreatedByCoOwner { get; set; }

    public virtual ICollection<Vote> Votes { get; set; } = new List<Vote>();
}

public enum ProposalStatus
{
    Pending = 1,        // Chờ bỏ phiếu
    Voting = 2,         // Đang bỏ phiếu
    Approved = 3,       // Đã được chấp thuận
    Rejected = 4,       // Bị từ chối
    Implemented = 5,    // Đã thực hiện
    Cancelled = 6       // Đã hủy
}

public enum ProposalType
{
    UpgradeBattery = 1,
    Repair = 2,
    SellVehicle = 3,
    InsuranceChange = 4,
    Maintenance = 5,
    Other = 99
}

