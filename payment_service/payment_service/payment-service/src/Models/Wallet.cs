using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PaymentService.Models
{
    [Table("Wallets", Schema = "Wallet")]
    public class Wallet : BaseEntity
    {
        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid GroupId { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; } = 0;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal FrozenAmount { get; set; } = 0;

        [Required]
        [StringLength(3)]
        public string Currency { get; set; } = "VND";

        public bool IsActive { get; set; } = true;

        // Navigation properties
        public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}

