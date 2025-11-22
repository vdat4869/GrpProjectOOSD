using AuthService.Data;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Services;

/// <summary>
/// Interface cho Session Service
/// Định nghĩa các phương thức quản lý user sessions
/// </summary>
public interface ISessionService
{
    /// <summary>Tạo session mới khi user đăng nhập</summary>
    Task<UserSession> CreateSessionAsync(int userId, string refreshToken, string? ipAddress, string? userAgent);
    
    /// <summary>Lấy session theo refresh token</summary>
    Task<UserSession?> GetSessionByRefreshTokenAsync(string refreshToken);
    
    /// <summary>Lấy danh sách sessions đang hoạt động của user</summary>
    Task<List<UserSession>> GetActiveSessionsAsync(int userId);
    
    /// <summary>Thu hồi một session (đăng xuất một thiết bị)</summary>
    Task RevokeSessionAsync(int sessionId);
    
    /// <summary>Thu hồi tất cả sessions của user</summary>
    Task RevokeAllSessionsAsync(int userId);
    
    /// <summary>Cập nhật thời gian hoạt động cuối cùng của session</summary>
    Task UpdateLastActivityAsync(int sessionId);
    
    /// <summary>Dọn dẹp các session đã hết hạn</summary>
    Task CleanupExpiredSessionsAsync();
}

/// <summary>
/// Service quản lý user sessions
/// Lưu trữ thông tin về các thiết bị/trình duyệt đang đăng nhập
/// </summary>
public class SessionService : ISessionService
{
    private readonly AuthDbContext _context;
    private readonly ILogger<SessionService> _logger;

    /// <summary>
    /// Constructor - Dependency Injection
    /// </summary>
    public SessionService(AuthDbContext context, ILogger<SessionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Tạo session mới khi user đăng nhập
    /// Mỗi lần đăng nhập từ một thiết bị/trình duyệt mới sẽ tạo một session mới
    /// </summary>
    /// <param name="userId">ID của user</param>
    /// <param name="refreshToken">Refresh token của session này</param>
    /// <param name="ipAddress">IP address của client</param>
    /// <param name="userAgent">User-Agent của client (trình duyệt, OS, v.v.)</param>
    /// <returns>UserSession đã được tạo</returns>
    public async Task<UserSession> CreateSessionAsync(int userId, string refreshToken, string? ipAddress, string? userAgent)
    {
        // Tạo session token unique (GUID)
        var sessionToken = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;
        var expiresAt = now.AddDays(7); // Session hết hạn sau 7 ngày

        // Tạo session entity
        var session = new UserSession
        {
            UserId = userId,
            SessionToken = sessionToken, // Unique identifier cho session
            RefreshToken = refreshToken, // Refresh token liên kết với session này
            IpAddress = ipAddress, // IP để theo dõi thiết bị
            UserAgent = userAgent, // User-Agent để biết trình duyệt/OS
            LoginAt = now, // Thời gian đăng nhập
            ExpiresAt = expiresAt, // Thời gian hết hạn
            LastActivityAt = now, // Thời gian hoạt động cuối cùng
            Status = SessionStatus.Active, // Trạng thái: Active
            CreatedAt = now,
            UpdatedAt = now
        };

        // Lưu vào database
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created session {SessionId} for user {UserId}", session.Id, userId);
        return session;
    }

    public async Task<UserSession?> GetSessionByRefreshTokenAsync(string refreshToken)
    {
        return await _context.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.RefreshToken == refreshToken && s.Status == SessionStatus.Active);
    }

    public async Task<List<UserSession>> GetActiveSessionsAsync(int userId)
    {
        var now = DateTime.UtcNow;
        return await _context.UserSessions
            .Where(s => s.UserId == userId && 
                       s.Status == SessionStatus.Active && 
                       s.ExpiresAt > now)
            .OrderByDescending(s => s.LastActivityAt)
            .ToListAsync();
    }

    public async Task RevokeSessionAsync(int sessionId)
    {
        var session = await _context.UserSessions.FindAsync(sessionId);
        if (session != null)
        {
            session.Status = SessionStatus.Revoked;
            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Revoked session {SessionId}", sessionId);
        }
    }

    public async Task RevokeAllSessionsAsync(int userId)
    {
        var now = DateTime.UtcNow;
        var activeSessions = await _context.UserSessions
            .Where(s => s.UserId == userId && 
                       s.Status == SessionStatus.Active && 
                       s.ExpiresAt > now)
            .ToListAsync();

        foreach (var session in activeSessions)
        {
            session.Status = SessionStatus.Revoked;
            session.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Revoked all {Count} sessions for user {UserId}", activeSessions.Count, userId);
    }

    public async Task UpdateLastActivityAsync(int sessionId)
    {
        var session = await _context.UserSessions.FindAsync(sessionId);
        if (session != null && session.Status == SessionStatus.Active)
        {
            session.LastActivityAt = DateTime.UtcNow;
            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task CleanupExpiredSessionsAsync()
    {
        var now = DateTime.UtcNow;
        var expiredSessions = await _context.UserSessions
            .Where(s => s.Status == SessionStatus.Active && s.ExpiresAt <= now)
            .ToListAsync();

        foreach (var session in expiredSessions)
        {
            session.Status = SessionStatus.Expired;
            session.UpdatedAt = now;
        }

        if (expiredSessions.Any())
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleaned up {Count} expired sessions", expiredSessions.Count);
        }
    }
}

