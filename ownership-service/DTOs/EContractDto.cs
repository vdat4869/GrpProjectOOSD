namespace OwnershipService.DTOs;

public class EContractDto
{
    public Guid Id { get; set; }
    public Guid CoOwnerId { get; set; }
    public string CoOwnerName { get; set; } = string.Empty;
    public Guid VehicleGroupId { get; set; }
    public string ContractTitle { get; set; } = string.Empty;
    public string ContractContent { get; set; } = string.Empty;
    public decimal OwnershipPercentage { get; set; }
    public string ContractStatus { get; set; } = string.Empty;
    public DateTime? SignedAt { get; set; }
    public string? Notes { get; set; }
    public string? FilePath { get; set; }
    public string? FileName { get; set; }
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

