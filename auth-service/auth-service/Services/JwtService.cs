using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using AuthService.Models;

namespace AuthService.Services;

/// <summary>
/// Interface cho JWT Service
/// Định nghĩa các phương thức tạo và validate JWT tokens
/// </summary>
public interface IJwtService
{
    /// <summary>Tạo JWT access token cho user</summary>
    string GenerateAccessToken(User user);
    
    /// <summary>Tạo refresh token (random string)</summary>
    string GenerateRefreshToken();
    
    /// <summary>Lấy claims từ expired token (để refresh)</summary>
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    
    /// <summary>Validate token có hợp lệ không</summary>
    bool ValidateToken(string token);
}

/// <summary>
/// Service xử lý JWT tokens
/// Tạo, validate và parse JWT tokens
/// </summary>
public class JwtService : IJwtService
{
    // Configuration để đọc cấu hình JWT từ appsettings.json
    private readonly IConfiguration _configuration;
    
    // Secret key để ký và verify JWT tokens
    private readonly string _secretKey;
    
    // Issuer (người phát hành token)
    private readonly string _issuer;
    
    // Audience (đối tượng nhận token)
    private readonly string _audience;
    
    // Thời gian hết hạn của access token (phút)
    private readonly int _expiresMinutes;

    /// <summary>
    /// Constructor - Đọc cấu hình JWT từ configuration
    /// </summary>
    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
        _secretKey = _configuration["JWT:Secret"] ?? throw new InvalidOperationException("JWT Secret không được cấu hình");
        _issuer = _configuration["JWT:Issuer"] ?? throw new InvalidOperationException("JWT Issuer không được cấu hình");
        _audience = _configuration["JWT:Audience"] ?? throw new InvalidOperationException("JWT Audience không được cấu hình");
        _expiresMinutes = int.Parse(_configuration["JWT:ExpiresMinutes"] ?? "60");
    }

    /// <summary>
    /// Tạo access token cho user
    /// Token chứa thông tin user (Id, Email, Name, Roles) và có thời gian hết hạn
    /// </summary>
    /// <param name="user">User entity để lấy thông tin</param>
    /// <returns>JWT access token dạng string</returns>
    public string GenerateAccessToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_secretKey);

        // Tạo claims (thông tin) cho token
        // Claims sẽ được encode vào token và có thể đọc lại khi validate
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()), // UserId
            new(ClaimTypes.Email, user.Email), // Email
            new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"), // Full name
            new("firstName", user.FirstName), // First name (custom claim)
            new("lastName", user.LastName), // Last name (custom claim)
            new("isActive", user.IsActive.ToString()) // IsActive (custom claim)
        };

        // Thêm roles vào claims
        // Roles được dùng để authorization (kiểm tra quyền truy cập)
        foreach (var userRole in user.UserRoles)
        {
            claims.Add(new Claim(ClaimTypes.Role, userRole.Role.Name));
        }

        // Cấu hình token descriptor
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims), // Claims trong token
            Expires = DateTime.UtcNow.AddMinutes(_expiresMinutes), // Thời gian hết hạn
            Issuer = _issuer, // Người phát hành
            Audience = _audience, // Đối tượng nhận
            // Ký token bằng HMAC SHA256 với secret key
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        // Tạo và serialize token thành string
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    /// <summary>
    /// Tạo refresh token
    /// Refresh token là một random string (không phải JWT), được lưu trong database
    /// </summary>
    /// <returns>Random string dạng Base64 (64 bytes = 88 ký tự Base64)</returns>
    public string GenerateRefreshToken()
    {
        // Tạo 64 bytes random
        var randomBytes = new byte[64];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        
        // Convert sang Base64 string
        return Convert.ToBase64String(randomBytes);
    }

    /// <summary>
    /// Lấy claims từ expired token (để refresh)
    /// Khi access token hết hạn, ta vẫn có thể đọc claims từ nó (không validate lifetime)
    /// để lấy UserId và tạo token mới
    /// </summary>
    /// <param name="token">JWT token đã expired</param>
    /// <returns>ClaimsPrincipal chứa claims từ token, null nếu token không hợp lệ</returns>
    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        // Cấu hình validation parameters
        // Không validate lifetime vì token đã expired
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false, // Không validate audience
            ValidateIssuer = false, // Không validate issuer
            ValidateIssuerSigningKey = true, // Vẫn phải validate chữ ký
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey)),
            ValidateLifetime = false // Không validate lifetime vì token đã expired
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);
        
        // Kiểm tra algorithm phải là HMAC SHA256
        if (securityToken is not JwtSecurityToken jwtSecurityToken || 
            !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
        {
            throw new SecurityTokenException("Token không hợp lệ");
        }

        return principal;
    }

    /// <summary>
    /// Validate token
    /// </summary>
    public bool ValidateToken(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_secretKey);

            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            return true;
        }
        catch
        {
            return false;
        }
    }
}
