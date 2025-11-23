using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PaymentService.Models
{
    public class Payment : BaseEntity
    {
        [Required]
        public Guid CostShareDetailId { get; set; }
        
        [Required]
        public Guid WalletId { get; set; }
        
        [Required]
        public PaymentMethodType Method { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "VND";
        
        [Required]
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
        
        [StringLength(200)]
        public string? TransactionId { get; set; }
        
        [StringLength(200)]
        public string? ExternalTransactionId { get; set; }
        
        [StringLength(1000)]
        public string? PaymentUrl { get; set; }
        
        [StringLength(1000)]
        public string? CallbackUrl { get; set; }
        
        [StringLength(1000)]
        public string? ReturnUrl { get; set; }
        
        public DateTime? ProcessedAt { get; set; }
        
        [StringLength(1000)]
        public string? ErrorMessage { get; set; }
        
        [StringLength(2000)]
        public string? Metadata { get; set; }
        
        // Navigation properties
        public virtual CostShareDetail CostShareDetail { get; set; } = null!;
        public virtual Wallet Wallet { get; set; } = null!;
    }
}
