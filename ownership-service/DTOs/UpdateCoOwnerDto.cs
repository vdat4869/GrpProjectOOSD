using System.ComponentModel.DataAnnotations;

namespace OwnershipService.DTOs;

public class UpdateCoOwnerDto
{
    [StringLength(200)]
    public string? FullName { get; set; }

    [StringLength(20)]
    public string? IdentityCardNumber { get; set; }

    [StringLength(20)]
    public string? DrivingLicenseNumber { get; set; }

    [EmailAddress]
    [StringLength(100)]
    public string? Email { get; set; }

    [StringLength(15)]
    public string? PhoneNumber { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }
}

