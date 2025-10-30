using PaymentService.Models;

namespace PaymentService.DTOs
{
    public class PaymentDto
    {
        public Guid Id { get; set; }
        public Guid CostShareDetailId { get; set; }
        // Wallet removed
        public PaymentMethodType Method { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "VND";
        public PaymentStatus Status { get; set; }
        public string? TransactionId { get; set; }
        public string? ExternalTransactionId { get; set; }
        public string? PaymentUrl { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? ErrorMessage { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePaymentDto
    {
        public Guid CostShareDetailId { get; set; }
        // Wallet removed
        public PaymentMethodType Method { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "VND";
        public string? CallbackUrl { get; set; }
        public string? ReturnUrl { get; set; }
    }

    public class PaymentCallbackDto
    {
        public string TransactionId { get; set; } = string.Empty;
        public string ExternalTransactionId { get; set; } = string.Empty;
        public PaymentStatus Status { get; set; }
        public string? ErrorMessage { get; set; }
        public string? Signature { get; set; }
    }

    public class PaymentMethodDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string MethodType { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string? AccountName { get; set; }
        public string? BankName { get; set; }
        public string? BankCode { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePaymentMethodDto
    {
        public Guid UserId { get; set; }
        public string MethodType { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string? AccountName { get; set; }
        public string? BankName { get; set; }
        public string? BankCode { get; set; }
        public bool IsDefault { get; set; } = false;
    }

    public class UpdatePaymentMethodDto
    {
        public string? AccountName { get; set; }
        public string? BankName { get; set; }
        public string? BankCode { get; set; }
        public bool? IsDefault { get; set; }
        public bool? IsActive { get; set; }
    }
}
