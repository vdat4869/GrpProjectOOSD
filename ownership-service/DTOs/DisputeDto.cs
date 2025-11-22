namespace OwnershipService.DTOs;

public class DisputeDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string RelatedId { get; set; } = string.Empty;
    public string RelatedType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? ResolvedBy { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateDisputeDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = "medium";
    public string RelatedId { get; set; } = string.Empty;
    public string RelatedType { get; set; } = string.Empty;
}

public class UpdateDisputeDto
{
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public string? ResolvedBy { get; set; }
}
