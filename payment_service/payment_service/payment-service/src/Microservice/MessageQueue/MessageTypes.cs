using System;

namespace PaymentService.Microservice.MessageQueue
{
    public class PaymentCreatedMessage
    {
        public Guid PaymentId { get; set; }
        public Guid UserId { get; set; }
        public Guid GroupId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class PaymentCompletedMessage
    {
        public Guid PaymentId { get; set; }
        public Guid UserId { get; set; }
        public Guid GroupId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public DateTime CompletedAt { get; set; }
    }

    public class PaymentFailedMessage
    {
        public Guid PaymentId { get; set; }
        public Guid UserId { get; set; }
        public Guid GroupId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
        public DateTime FailedAt { get; set; }
    }

    public class PaymentRefundedMessage
    {
        public Guid PaymentId { get; set; }
        public Guid UserId { get; set; }
        public Guid GroupId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime RefundedAt { get; set; }
    }

    public class WalletUpdatedMessage
    {
        public Guid WalletId { get; set; }
        public Guid UserId { get; set; }
        public Guid GroupId { get; set; }
        public decimal Balance { get; set; }
        public decimal FrozenAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string TransactionType { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }

    public class CostShareCreatedMessage
    {
        public Guid CostShareId { get; set; }
        public Guid GroupId { get; set; }
        public Guid VehicleId { get; set; }
        public decimal TotalAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
