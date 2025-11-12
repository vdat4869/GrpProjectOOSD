using System.ComponentModel.DataAnnotations;

namespace OwnershipService.DTOs;

public class CreateEContractDto
{
    [Required]
    public Guid CoOwnerId { get; set; }

    [Required]
    public Guid VehicleGroupId { get; set; }

    [Required]
    [StringLength(200)]
    public string ContractTitle { get; set; } = string.Empty;

    [Required]
    [StringLength(5000)]
    public string ContractContent { get; set; } = string.Empty;

    [Required]
    [Range(0.01, 100.00)]
    public decimal OwnershipPercentage { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public DateTime? ExpiresAt { get; set; }
}

