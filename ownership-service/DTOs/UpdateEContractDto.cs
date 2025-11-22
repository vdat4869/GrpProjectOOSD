using System.ComponentModel.DataAnnotations;

namespace OwnershipService.DTOs;

public class UpdateEContractDto
{
    [StringLength(200)]
    public string? ContractTitle { get; set; }

    [StringLength(5000)]
    public string? ContractContent { get; set; }

    [Range(0.01, 100.00)]
    public decimal? OwnershipPercentage { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public DateTime? ExpiresAt { get; set; }
}

