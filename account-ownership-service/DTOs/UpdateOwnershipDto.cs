using System.ComponentModel.DataAnnotations;

namespace AccountOwnershipService.DTOs;

public class UpdateOwnershipDto
{
    [Range(0.01, 100.00)]
    public decimal? OwnershipPercentage { get; set; }

    public DateTime? EndDate { get; set; }

    public bool? IsActive { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

