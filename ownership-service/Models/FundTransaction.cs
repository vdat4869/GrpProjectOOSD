using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OwnershipService.Models;

/// <summary>
/// Giao dịch quỹ nhóm (đóng góp, chi tiêu)
/// </summary>
public class FundTransaction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid GroupFundId { get; set; }

    [Required]
    public Guid CoOwnerId { get; set; } // Người thực hiện giao dịch

    [Required]
    public TransactionType Type { get; set; } // Contribution (đóng góp) hoặc Expense (chi tiêu)

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "VND";

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(200)]
    public string? Category { get; set; } // Ví dụ: "Bảo dưỡng", "Bảo hiểm", "Đóng góp"

    [MaxLength(100)]
    public string? ReceiptNumber { get; set; } // Số hóa đơn/biên lai

    [MaxLength(500)]
    public string? ReceiptImageUrl { get; set; } // Link ảnh hóa đơn

    [Required]
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;

    public Guid? ApprovedByCoOwnerId { get; set; } // Người duyệt (nếu cần)

    public DateTime? ApprovedAt { get; set; }

    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(GroupFundId))]
    public virtual GroupFund? GroupFund { get; set; }

    [ForeignKey(nameof(CoOwnerId))]
    public virtual CoOwner? CoOwner { get; set; }
}

public enum TransactionType
{
    Contribution = 1, // Đóng góp
    Expense = 2       // Chi tiêu
}

public enum TransactionStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3
}

