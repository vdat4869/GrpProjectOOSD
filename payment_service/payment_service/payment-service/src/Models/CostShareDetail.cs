using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PaymentService.Models
{
    public class CostShareDetail : BaseEntity
    {
        [Required]
        public Guid CostShareId { get; set; }
        
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal OwnershipPercentage { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "VND";
        
        public CostShareDetailStatus Status { get; set; } = CostShareDetailStatus.Pending;
        
        public DateTime? PaidDate { get; set; }
        
        [StringLength(500)]
        public string? Notes { get; set; }
        
        // Navigation properties
        public virtual CostShare CostShare { get; set; } = null!;
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
