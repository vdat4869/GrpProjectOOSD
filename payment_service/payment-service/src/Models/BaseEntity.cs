using System.ComponentModel.DataAnnotations;

namespace PaymentService.Models
{
    public class BaseEntity
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public string? UpdatedBy { get; set; }
        public bool IsDeleted { get; set; } = false;
    }

    public enum PaymentStatus
    {
        Pending = 0,
        Processing = 1,
        Completed = 2,
        Failed = 3,
        Cancelled = 4,
        Refunded = 5
    }

    public enum PaymentMethodType
    {
        Banking = 2,
        EWallet = 3,
        Cash = 4
    }

    public enum CostType
    {
        Charging = 0,
        Insurance = 1,
        Maintenance = 2,
        Registration = 3,
        Cleaning = 4,
        Parking = 5,
        Toll = 6,
        Other = 7
    }

    public enum TransactionType
    {
        Payment = 0,
        Refund = 1,
        Transfer = 2,
        Deposit = 3,
        Withdrawal = 4
    }

    public enum CostShareStatus
    {
        Pending = 0,
        Paid = 1,
        Overdue = 2
    }

    public enum CostShareDetailStatus
    {
        Pending = 0,
        Paid = 1,
        Overdue = 2
    }
}
