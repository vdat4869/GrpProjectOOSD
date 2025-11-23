using System.ComponentModel.DataAnnotations;

namespace PaymentService.DTOs
{
    public class TransactionDto
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public int Type { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "VND";
        public string? Description { get; set; }
        public string? Reference { get; set; }
        public Guid? RelatedTransactionId { get; set; }
        public int Status { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? Metadata { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateTransactionDto
    {
        [Required]
        public Guid WalletId { get; set; }

        [Required]
        public int Type { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        public string Currency { get; set; } = "VND";

        public string? Description { get; set; }

        public string? Reference { get; set; }

        public Guid? RelatedTransactionId { get; set; }

        public string? Metadata { get; set; }
    }
}

