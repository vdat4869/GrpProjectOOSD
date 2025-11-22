namespace AuthService.Models;

/// <summary>
/// Entity UserSession - đại diện cho session đăng nhập của user
/// </summary>
public class UserSession
{
    public int Id { get; set; }
    
    /// <summary>
    /// User ID
    /// </summary>
    public int UserId { get; set; }
    
    /// <summary>
    /// Session token (unique identifier)
    /// </summary>
    public string SessionToken { get; set; } = string.Empty;
    
    /// <summary>
    /// Refresh token associated with this session
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;
    
    /// <summary>
    /// IP address của client
    /// </summary>
    public string? IpAddress { get; set; }
    
    /// <summary>
    /// User agent của client
    /// </summary>
    public string? UserAgent { get; set; }
    
    /// <summary>
    /// Thời gian đăng nhập
    /// </summary>
    public DateTime LoginAt { get; set; }
    
    /// <summary>
    /// Thời gian hết hạn session
    /// </summary>
    public DateTime ExpiresAt { get; set; }
    
    /// <summary>
    /// Thời gian hoạt động cuối cùng
    /// </summary>
    public DateTime LastActivityAt { get; set; }
    
    /// <summary>
    /// Trạng thái session (Active, Expired, Revoked)
    /// </summary>
    public SessionStatus Status { get; set; }
    
    /// <summary>
    /// Thời gian tạo
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Thời gian cập nhật
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
}

/// <summary>
/// Trạng thái session
/// </summary>
public enum SessionStatus
{
    Active = 1,
    Expired = 2,
    Revoked = 3
}

