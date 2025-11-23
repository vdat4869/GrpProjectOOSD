using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PaymentService.Models
{
    public class PaymentMethod : BaseEntity
    {
        [Required]
        public Guid UserId { get; set; }
        
        [Required]
        [StringLength(50)]
        public string MethodType { get; set; } = string.Empty; // Banking, EWallet, Cash, etc.
        
        [Required]
        [StringLength(200)]
        public string AccountNumber { get; set; } = string.Empty;
        
        [StringLength(200)]
        public string? AccountName { get; set; }
        
        [StringLength(100)]
        public string? BankName { get; set; }
        
        [StringLength(100)]
        public string? BankCode { get; set; }
        
        public bool IsDefault { get; set; } = false;
        
        public bool IsActive { get; set; } = true;
        
        [StringLength(1000)]
        public string? Metadata { get; set; }
    }
}
