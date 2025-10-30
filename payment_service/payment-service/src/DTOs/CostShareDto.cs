using PaymentService.Models;

namespace PaymentService.DTOs
{
    public class CostShareDto
    {
        public Guid Id { get; set; }
        public Guid GroupId { get; set; }
        public Guid VehicleId { get; set; }
        public CostType CostType { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal TotalAmount { get; set; }
        public string Currency { get; set; } = "VND";
        public DateTime DueDate { get; set; }
        public DateTime? PaidDate { get; set; }
        public PaymentStatus Status { get; set; }
        public string? ReceiptUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<CostShareDetailDto> CostShareDetails { get; set; } = new();
    }

    public class CreateCostShareDto
    {
        public Guid GroupId { get; set; }
        public Guid VehicleId { get; set; }
        public CostType CostType { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal TotalAmount { get; set; }
        public string Currency { get; set; } = "VND";
        public DateTime DueDate { get; set; }
        public string? ReceiptUrl { get; set; }
        public List<CreateCostShareDetailDto> CostShareDetails { get; set; } = new();
    }

    public class UpdateCostShareDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public decimal? TotalAmount { get; set; }
        public DateTime? DueDate { get; set; }
        public string? ReceiptUrl { get; set; }
    }

    public class CostShareDetailDto
    {
        public Guid Id { get; set; }
        public Guid CostShareId { get; set; }
        public Guid UserId { get; set; }
        public decimal OwnershipPercentage { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "VND";
        public PaymentStatus Status { get; set; }
        public DateTime? PaidDate { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateCostShareDetailDto
    {
        public Guid UserId { get; set; }
        public decimal OwnershipPercentage { get; set; }
        public decimal Amount { get; set; }
        public string? Notes { get; set; }
    }
}
