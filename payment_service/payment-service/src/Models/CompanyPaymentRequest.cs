using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PaymentService.Models
{
    /// <summary>
    /// Company Payment Request - Yêu cầu thanh toán công ty
    /// Khi người dùng sử dụng dịch vụ và công ty trả trước, họ sẽ tạo request này
    /// </summary>
    public class CompanyPaymentRequest : BaseEntity
    {
        [Required]
        public Guid UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string ServiceType { get; set; } = string.Empty; // charging, maintenance, cleaning, parking, other

        [Column(TypeName = "decimal(18,2)")]
        public decimal? Amount { get; set; } // Số tiền (nếu không dùng QR)

        [StringLength(1000)]
        public string? Description { get; set; }

        [StringLength(500)]
        public string? QrCode { get; set; } // Mã QR nếu dịch vụ có QR

        [StringLength(2000)]
        public string? ImageUrls { get; set; } // JSON array of image URLs

        [Required]
        [StringLength(50)]
        public CompanyPaymentRequestStatus Status { get; set; } = CompanyPaymentRequestStatus.Pending;

        [StringLength(1000)]
        public string? CompanyNotes { get; set; } // Ghi chú từ công ty khi xử lý

        public DateTime? ProcessedAt { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? RefundAmount { get; set; } // Số tiền hoàn trả

        [StringLength(200)]
        public string? RefundTransactionId { get; set; } // ID giao dịch hoàn trả
    }

    public enum CompanyPaymentRequestStatus
    {
        Pending = 0,      // Đang chờ xử lý
        Processing = 1,  // Đang xử lý
        Approved = 2,    // Đã duyệt
        Rejected = 3,    // Từ chối
        Refunded = 4,    // Đã hoàn trả
        Completed = 5,   // Hoàn thành
        Cancelled = 6    // Đã hủy (bởi user)
    }
}

