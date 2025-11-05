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


