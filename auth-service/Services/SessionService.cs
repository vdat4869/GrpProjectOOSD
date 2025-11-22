using AuthService.Data;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Services;

public interface ISessionService
{
    Task<UserSession> CreateSessionAsync(int userId, string refreshToken, string? ipAddress, string? userAgent);
    Task<UserSession?> GetSessionByRefreshTokenAsync(string refreshToken);
    Task<List<UserSession>> GetActiveSessionsAsync(int userId);
    Task RevokeSessionAsync(int sessionId);
    Task RevokeAllSessionsAsync(int userId);
    Task UpdateLastActivityAsync(int sessionId);
    Task CleanupExpiredSessionsAsync();
}

public class SessionService : ISessionService
{
    private readonly AuthDbContext _context;
    private readonly ILogger<SessionService> _logger;

    public SessionService(AuthDbContext context, ILogger<SessionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<UserSession> CreateSessionAsync(int userId, string refreshToken, string? ipAddress, string? userAgent)
    {
        var sessionToken = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;
        var expiresAt = now.AddDays(7); // 7 days expiry

        var session = new UserSession
        {
            UserId = userId,
            SessionToken = sessionToken,
            RefreshToken = refreshToken,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            LoginAt = now,
            ExpiresAt = expiresAt,
            LastActivityAt = now,
            Status = SessionStatus.Active,
            CreatedAt = now,
            UpdatedAt = now
        };

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

