namespace PaymentService.DTOs
{
    public class CompanyPaymentRequestDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string ServiceType { get; set; } = string.Empty;
        public decimal? Amount { get; set; }
        public string? Description { get; set; }
        public string? QrCode { get; set; }
        public List<string>? ImageUrls { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? CompanyNotes { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public decimal? RefundAmount { get; set; }
        public string? RefundTransactionId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateCompanyPaymentRequestDto
    {
        public string ServiceType { get; set; } = string.Empty;
        public decimal? Amount { get; set; }
        public string? Description { get; set; }
        public string? QrCode { get; set; }
        public List<string>? ImageUrls { get; set; }
    }

    public class UpdateCompanyPaymentRequestDto
    {
        public string? Status { get; set; }
        public string? CompanyNotes { get; set; }
        public decimal? RefundAmount { get; set; }
        public string? RefundTransactionId { get; set; }
    }
}

