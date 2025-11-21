namespace AuthService.DTOs;

public enum KycStatus
{
    NotSubmitted = 0,
    Pending = 1,
    Approved = 2,
    Rejected = 3
}

public class SubmitIdentityRequest
{
    public string NationalIdNumber { get; set; } = string.Empty; // CMND/CCCD
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string DateOfBirth { get; set; } = string.Empty; // ISO yyyy-MM-dd
    public string Address { get; set; } = string.Empty;
}

public class SubmitIdentityResponse
{
    public bool Accepted { get; set; }
    public string ReferenceId { get; set; } = string.Empty;
    public KycStatus Status { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class UploadLicenseRequest
{
    public string LicenseNumber { get; set; } = string.Empty;
    public string IssuedDate { get; set; } = string.Empty; // ISO yyyy-MM-dd
    public string ExpiryDate { get; set; } = string.Empty; // ISO yyyy-MM-dd
}

public class UploadLicenseResponse
{
    public bool Accepted { get; set; }
    public string ReferenceId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class KycStatusResponse
{
    public KycStatus Status { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class VerifyKycRequest
{
    public string Status { get; set; } = string.Empty; // "Approved" or "Rejected"
    public string? Notes { get; set; }
}

public class KycRequestDto
{
    public int UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public int IdentityDocumentId { get; set; }
    public string IdentityStatus { get; set; } = string.Empty;
    public string IdentityDocumentNumber { get; set; } = string.Empty;
    public string IdentityFullName { get; set; } = string.Empty;
    public int? LicenseId { get; set; }
    public string LicenseStatus { get; set; } = string.Empty;
    public string? LicenseNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}


