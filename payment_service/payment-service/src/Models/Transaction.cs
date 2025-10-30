using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PaymentService.Models
{
    public class Transaction : BaseEntity
    {
        [Required]
        public Guid WalletId { get; set; }
        
        [Required]
        public TransactionType Type { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "VND";
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        [StringLength(100)]
        public string? Reference { get; set; }
        
        public Guid? RelatedTransactionId { get; set; }
        
        [Required]
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
        
        public DateTime? ProcessedAt { get; set; }
        
        [StringLength(1000)]
        public string? Metadata { get; set; }
        
        // Navigation properties (wallet removed)
        public virtual Transaction? RelatedTransaction { get; set; }
        public virtual ICollection<Transaction> RelatedTransactions { get; set; } = new List<Transaction>();
    }
}
