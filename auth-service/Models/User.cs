namespace AuthService.Models;

/// <summary>
/// Entity User - đại diện cho người dùng trong hệ thống
/// </summary>
public class User
{
    public int Id { get; set; }
    
    /// <summary>
    /// Email đăng nhập (unique)
    /// </summary>
    public string Email { get; set; } = string.Empty;
    
    /// <summary>
    /// Mật khẩu đã được hash
    /// </summary>
    public string PasswordHash { get; set; } = string.Empty;
    
    /// <summary>
    /// Tên
    /// </summary>
    public string FirstName { get; set; } = string.Empty;
    
    /// <summary>
    /// Họ
    /// </summary>
    public string LastName { get; set; } = string.Empty;
    
    /// <summary>
    /// Số điện thoại
    /// </summary>
    public string? PhoneNumber { get; set; }
    
    /// <summary>
    /// Ngày tạo tài khoản
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Ngày cập nhật cuối
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    /// <summary>
    /// Trạng thái hoạt động của tài khoản
    /// </summary>
    public bool IsActive { get; set; }
    
    /// <summary>
    /// Refresh token để làm mới JWT
    /// </summary>
    public string? RefreshToken { get; set; }
    
    /// <summary>
    /// Thời gian hết hạn của refresh token
    /// </summary>
    public DateTime? RefreshTokenExpiryTime { get; set; }

    // Navigation properties
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

/// <summary>
/// Entity Role - đại diện cho vai trò trong hệ thống
/// </summary>
public class Role
{
    public int Id { get; set; }
    
    /// <summary>
    /// Tên vai trò (CoOwner, Staff, Admin)
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Mô tả vai trò
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Ngày tạo vai trò
    /// </summary>
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

/// <summary>
/// Entity UserRole - liên kết many-to-many giữa User và Role
/// </summary>
public class UserRole
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
    
    /// <summary>
    /// Ngày gán vai trò
    /// </summary>
    public DateTime AssignedAt { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual Role Role { get; set; } = null!;
}
