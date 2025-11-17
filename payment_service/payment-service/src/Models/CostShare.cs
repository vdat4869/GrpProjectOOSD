using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PaymentService.Models
{
    public class CostShare : BaseEntity
    {
        [Required]
        public Guid GroupId { get; set; }
        
        [Required]
        public Guid VehicleId { get; set; }
        
        [Required]
        public CostType CostType { get; set; }
        
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [StringLength(1000)]
        public string? Description { get; set; }
        
        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }
        
        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "VND";
        
        [Required]
        public DateTime DueDate { get; set; }
        
        public DateTime? PaidDate { get; set; }
        
        [Required]
        public CostShareStatus Status { get; set; } = CostShareStatus.Pending;
        
        [StringLength(500)]
        public string? ReceiptUrl { get; set; }
        
        [StringLength(1000)]
        public string? Metadata { get; set; }
        
        // Navigation properties
        public virtual ICollection<CostShareDetail> CostShareDetails { get; set; } = new List<CostShareDetail>();
        public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
