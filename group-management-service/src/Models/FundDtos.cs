using System.ComponentModel.DataAnnotations;

namespace GroupManagementService.Models
{
    public class CreateFundRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public string Name { get; set; } = "Quỹ chung";
    }

    public class DepositRequest
    {
        [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
        public decimal Amount { get; set; }
        public string? Description { get; set; }
    }

    public class WithdrawRequest
    {
        [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
        public decimal Amount { get; set; }
        public string? Description { get; set; }
    }
}


