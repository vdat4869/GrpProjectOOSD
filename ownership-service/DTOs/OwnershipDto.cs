namespace OwnershipService.DTOs;

public class OwnershipDto
{
    public Guid Id { get; set; }
    public Guid CoOwnerId { get; set; }
    public string CoOwnerName { get; set; } = string.Empty;
    public Guid VehicleGroupId { get; set; }
    public decimal OwnershipPercentage { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

