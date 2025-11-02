using System.ComponentModel.DataAnnotations;

namespace AccountOwnershipService.DTOs;

public class CreateOwnershipDto
{
    [Required]
    public Guid CoOwnerId { get; set; }

    [Required]
    public Guid VehicleGroupId { get; set; }

    [Required]
    [Range(0.01, 100.00)]
    public decimal OwnershipPercentage { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

