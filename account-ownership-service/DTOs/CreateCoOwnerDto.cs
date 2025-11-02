using System.ComponentModel.DataAnnotations;

namespace AccountOwnershipService.DTOs;

public class CreateCoOwnerDto
{
    [Required]
    [StringLength(100)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string IdentityCardNumber { get; set; } = string.Empty;

    [StringLength(20)]
    public string? DrivingLicenseNumber { get; set; }

    [Required]
    [EmailAddress]
    [StringLength(100)]
    public string Email { get; set; } = string.Empty;

    [StringLength(15)]
    public string? PhoneNumber { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }
}

