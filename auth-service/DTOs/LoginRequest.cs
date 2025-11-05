namespace AuthService.DTOs;

/// <summary>
/// DTO cho yêu cầu đăng ký tài khoản mới
/// </summary>
public class RegisterRequest
{
    /// <summary>
    /// Email đăng ký
    /// </summary>
    public string Email { get; set; } = string.Empty;
    
    /// <summary>
    /// Mật khẩu
    /// </summary>
    public string Password { get; set; } = string.Empty;
    
    /// <summary>
    /// Xác nhận mật khẩu
    /// </summary>
    public string ConfirmPassword { get; set; } = string.Empty;
    
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
    /// Ngày sinh
    /// </summary>
    public DateTime? DateOfBirth { get; set; }
    
    /// <summary>
    /// Địa chỉ
    /// </summary>
    public string? Address { get; set; }
    
    /// <summary>
    /// Số CMND/CCCD (tùy chọn khi đăng ký)
    /// </summary>
    public string? IdentityNumber { get; set; }
    
    /// <summary>
    /// Danh sách roles (mặc định: ["CoOwner"])
    /// </summary>
    public List<string> Roles { get; set; } = new List<string>();
}

/// <summary>
/// DTO cho yêu cầu đăng nhập
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// Email đăng nhập
    /// </summary>
    public string Email { get; set; } = string.Empty;
    
    /// <summary>
    /// Mật khẩu
    /// </summary>
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho phản hồi đăng nhập thành công
/// </summary>
public class LoginResponse
{
    /// <summary>
    /// JWT Access Token
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Refresh Token để làm mới access token
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Thời gian hết hạn của access token (Unix timestamp)
    /// </summary>
    public long ExpiresAt { get; set; }
    
    /// <summary>
    /// Thông tin người dùng
    /// </summary>
    public UserDto User { get; set; } = null!;
}

/// <summary>
/// DTO cho thông tin người dùng
/// </summary>
public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new List<string>();
}

/// <summary>
/// DTO cho yêu cầu làm mới token
/// </summary>
public class RefreshTokenRequest
{
    /// <summary>
    /// Refresh token hiện tại
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;
}

/// <summary>
/// DTO cho phản hồi làm mới token
/// </summary>
public class RefreshTokenResponse
{
    /// <summary>
    /// JWT Access Token mới
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Refresh Token mới
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Thời gian hết hạn của access token mới (Unix timestamp)
    /// </summary>
    public long ExpiresAt { get; set; }
}

/// <summary>
/// DTO cho phản hồi chung của API
/// </summary>
public class ApiResponse<T>
{
    /// <summary>
    /// Trạng thái thành công hay không
    /// </summary>
    public bool Success { get; set; }
    
    /// <summary>
    /// Thông báo
    /// </summary>
    public string Message { get; set; } = string.Empty;
    
    /// <summary>
    /// Dữ liệu trả về
    /// </summary>
    public T? Data { get; set; }
    
    /// <summary>
    /// Danh sách lỗi (nếu có)
    /// </summary>
    public List<string> Errors { get; set; } = new List<string>();
}
