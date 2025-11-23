namespace AuthService.Models;

/// <summary>
/// Entity IdentityDocument - CMND/CCCD/Hộ chiếu
/// </summary>
public class IdentityDocument
{
    public int Id { get; set; }
    
    /// <summary>
    /// ID user sở hữu document
    /// </summary>
    public int UserId { get; set; }
    
    /// <summary>
    /// Loại giấy tờ
    /// </summary>
    public IdentityDocumentType DocumentType { get; set; }
    
    /// <summary>
    /// Số giấy tờ
    /// </summary>
    public string DocumentNumber { get; set; } = string.Empty;
    
    /// <summary>
    /// Họ tên trên giấy tờ
    /// </summary>
    public string FullName { get; set; } = string.Empty;
    
    /// <summary>
    /// Ngày sinh
    /// </summary>
    public DateTime DateOfBirth { get; set; }
    
    /// <summary>
    /// Giới tính
    /// </summary>
    public string? Gender { get; set; }
    
    /// <summary>
    /// Quốc tịch
    /// </summary>
    public string? Nationality { get; set; }
    
    /// <summary>
    /// Nơi cấp
    /// </summary>
    public string? PlaceOfIssue { get; set; }
    
    /// <summary>
    /// Ngày cấp
    /// </summary>
    public DateTime? IssueDate { get; set; }
    
    /// <summary>
    /// Ngày hết hạn
    /// </summary>
    public DateTime? ExpiryDate { get; set; }
    
    /// <summary>
    /// Đường dẫn ảnh mặt trước
    /// </summary>
    public string? FrontImagePath { get; set; }
    
    /// <summary>
    /// Đường dẫn ảnh mặt sau
    /// </summary>
    public string? BackImagePath { get; set; }
    
    /// <summary>
    /// Trạng thái xác minh
    /// </summary>
    public VerificationStatus VerificationStatus { get; set; }
    
    /// <summary>
    /// Ngày tạo
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Ngày cập nhật cuối
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    /// <summary>
    /// Trạng thái hoạt động
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    // Navigation properties
    public virtual User? User { get; set; }
}

/// <summary>
/// Entity DrivingLicense - Bằng lái xe
/// </summary>
public class DrivingLicense
{
    public int Id { get; set; }
    
    /// <summary>
    /// ID user sở hữu bằng lái
    /// </summary>
    public int UserId { get; set; }
    
    /// <summary>
    /// Số bằng lái
    /// </summary>
    public string LicenseNumber { get; set; } = string.Empty;
    
    /// <summary>
    /// Hạng bằng lái (B1, B2, C, D, etc.)
    /// </summary>
    public string LicenseClass { get; set; } = string.Empty;
    
    /// <summary>
    /// Họ tên trên bằng lái
    /// </summary>
    public string FullName { get; set; } = string.Empty;
    
    /// <summary>
    /// Ngày sinh
    /// </summary>
    public DateTime DateOfBirth { get; set; }
    
    /// <summary>
    /// Địa chỉ
    /// </summary>
    public string? Address { get; set; }
    
    /// <summary>
    /// Nơi cấp
    /// </summary>
    public string? PlaceOfIssue { get; set; }
    
    /// <summary>
    /// Ngày cấp
    /// </summary>
    public DateTime IssueDate { get; set; }
    
    /// <summary>
    /// Ngày hết hạn
    /// </summary>
    public DateTime ExpiryDate { get; set; }
    
    /// <summary>
    /// Đường dẫn ảnh bằng lái
    /// </summary>
    public string? ImagePath { get; set; }
    
    /// <summary>
    /// Trạng thái xác minh
    /// </summary>
    public VerificationStatus VerificationStatus { get; set; }
    
    /// <summary>
    /// Ghi chú
    /// </summary>
    public string? Notes { get; set; }
    
    /// <summary>
    /// Ngày tạo
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Ngày cập nhật cuối
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    /// <summary>
    /// Trạng thái hoạt động
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    // Navigation properties
    public virtual User? User { get; set; }
}

/// <summary>
/// Enum loại giấy tờ định danh
/// </summary>
public enum IdentityDocumentType
{
    CitizenId = 0,      // CMND/CCCD
    Passport = 1,       // Hộ chiếu
    NationalId = 2     // Chứng minh quốc gia
}

/// <summary>
/// Enum trạng thái xác minh
/// </summary>
public enum VerificationStatus
{
    Pending = 0,        // Chờ xử lý
    Verifying = 1,      // Đang xác minh
    Approved = 2,      // Đã duyệt
    Rejected = 3,      // Từ chối
    Expired = 4        // Hết hạn
}

