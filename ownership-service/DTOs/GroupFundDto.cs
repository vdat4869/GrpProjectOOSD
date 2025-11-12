namespace OwnershipService.DTOs;

public class GroupFundDto
{
    public Guid Id { get; set; }
    public Guid VehicleGroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "VND";
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int TransactionCount { get; set; }
}

public class CreateGroupFundDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Currency { get; set; } = "VND";
}

public class FundTransactionDto
{
    public Guid Id { get; set; }
    public Guid GroupFundId { get; set; }
    public Guid CoOwnerId { get; set; }
    public string CoOwnerName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // Contribution, Expense
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? ReceiptImageUrl { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? ApprovedByCoOwnerId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime TransactionDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateFundTransactionDto
{
    public string Type { get; set; } = string.Empty; // Contribution, Expense
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? ReceiptImageUrl { get; set; }
    public DateTime? TransactionDate { get; set; }
}

public class ApproveFundTransactionDto
{
    public string? Comment { get; set; }
}

