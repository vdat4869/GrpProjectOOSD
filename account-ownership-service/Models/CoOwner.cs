using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AccountOwnershipService.Models;

public class CoOwner
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string UserId { get; set; } = string.Empty; // Reference to Auth Service User ID

    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string IdentityCardNumber { get; set; } = string.Empty; // CMND/CCCD

    [MaxLength(20)]
    public string? DrivingLicenseNumber { get; set; }

    [Required]
    [MaxLength(100)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [MaxLength(15)]
    public string? PhoneNumber { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    public bool IsVerified { get; set; } = false;

    public DateTime VerifiedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<Ownership> Ownerships { get; set; } = new List<Ownership>();
    public virtual ICollection<EContract> EContracts { get; set; } = new List<EContract>();
}

