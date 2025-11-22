using Microsoft.AspNetCore.Mvc;
using AuthService.DTOs;
using AuthService.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using AuthService.Data;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Controllers;

/// <summary>
/// Controller xử lý authentication và authorization
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AuthDbContext _db;
    private readonly IWebHostEnvironment _env;

    public AuthController(IAuthService authService, AuthDbContext db, IWebHostEnvironment env)
    {
        _authService = authService;
        _db = db;
        _env = env;
    }

    public class SeedUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public List<string> Roles { get; set; } = new();
    }

    /// <summary>
    /// Dev-only: Seed admin user nếu chưa tồn tại
    /// </summary>
    [HttpPost("seed-admin")]
    [AllowAnonymous]
    public async Task<IActionResult> SeedAdmin()
    {
        if (!_env.IsDevelopment()) return Forbid();

        var adminEmail = "admin@example.com";
        var admin = await _db.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email == adminEmail);
        var adminRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
        if (adminRole == null)
        {
            adminRole = new Role { Name = "Admin", Description = "Quản trị viên hệ thống", CreatedAt = DateTime.UtcNow };
            _db.Roles.Add(adminRole);
            await _db.SaveChangesAsync();
        }
        if (admin == null)
        {
            var pwHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345");
            admin = new User
            {
                Email = adminEmail,
                PasswordHash = pwHash,
                FirstName = "System",
                LastName = "Admin",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _db.Users.Add(admin);
            await _db.SaveChangesAsync();
        }
        else
        {
            // Update password if admin already exists (for test/dev purposes)
            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345");
            admin.IsActive = true;
            admin.UpdatedAt = DateTime.UtcNow;
            _db.Users.Update(admin);  // Explicitly mark as modified
            await _db.SaveChangesAsync();
        }
        if (!admin.UserRoles.Any(ur => ur.RoleId == adminRole.Id))
        {
            _db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id, AssignedAt = DateTime.UtcNow });
            await _db.SaveChangesAsync();
        }
        return Ok(new { seeded = true, email = adminEmail });
    }

    /// <summary>
    /// Dev-only: Seed user với vai trò tùy chọn (ví dụ Staff/CoOwner)
    /// </summary>
    [HttpPost("seed-user")]
    [AllowAnonymous]
    public async Task<IActionResult> SeedUser([FromBody] SeedUserRequest req)
    {
        if (!_env.IsDevelopment()) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email và Password là bắt buộc" });

        var user = await _db.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null)
        {
            user = new User
            {
                Email = req.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                FirstName = req.FirstName,
                LastName = req.LastName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else
        {
            // Update password if user already exists (for test/dev purposes)
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
            user.FirstName = req.FirstName;
            user.LastName = req.LastName;
            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;
            _db.Users.Update(user);  // Explicitly mark as modified
            await _db.SaveChangesAsync();
        }

        var normalizedRoles = (req.Roles?.Count > 0 ? req.Roles : new List<string> { "CoOwner" })
            .Select(r => r.Trim())
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var roleName in normalizedRoles)
        {
            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (role == null)
            {
                role = new Role { Name = roleName, Description = $"Role {roleName}", CreatedAt = DateTime.UtcNow };
                _db.Roles.Add(role);
                await _db.SaveChangesAsync();
            }
            if (!user.UserRoles.Any(ur => ur.RoleId == role.Id))
            {
                _db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id, AssignedAt = DateTime.UtcNow });
            }
        }
        await _db.SaveChangesAsync();

        return Ok(new { seeded = true, email = user.Email, roles = normalizedRoles });
    }

    /// <summary>
    /// Đăng nhập vào hệ thống
    /// </summary>
    /// <param name="request">Thông tin đăng nhập</param>
    /// <returns>JWT token và thông tin user</returns>
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers["User-Agent"].ToString();
        var result = await _authService.LoginAsync(request, ipAddress, userAgent);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đăng nhập đơn giản (hỗ trợ form-url-encoded hoặc query) để tiện smoke test từ CMD
    /// </summary>
    [HttpPost("login-simple")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> LoginSimple()
    {
        string? email = null;
        string? password = null;

        if (Request.HasFormContentType && Request.Form.Count > 0)
        {
            email = Request.Form["Email"].FirstOrDefault();
            password = Request.Form["Password"].FirstOrDefault();
        }
        else
        {
            email = Request.Query["Email"].FirstOrDefault();
            password = Request.Query["Password"].FirstOrDefault();
        }

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return BadRequest(new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = "Email và Password là bắt buộc",
                Errors = new List<string> { "EmailRequired", "PasswordRequired" }
            });
        }

        var result = await _authService.LoginAsync(new LoginRequest
        {
            Email = email.Trim(),
            Password = password
        });

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Dev-only: Trả về access token Admin dạng text/plain để tiện lấy token bằng curl
    /// </summary>
    [HttpGet("dev-token")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDevAdminToken()
    {
        if (!_env.IsDevelopment()) return Forbid();

        // Ensure admin exists
        var adminEmail = "admin@example.com";
        var admin = await _db.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
        if (admin == null)
        {
            var seed = await SeedAdmin();
            if (seed is ObjectResult or && or.StatusCode is >= 400)
            {
                return StatusCode(or.StatusCode ?? 500, "Failed to seed admin");
            }
        }

        var login = await _authService.LoginAsync(new LoginRequest
        {
            Email = adminEmail,
            Password = "Admin@12345"
        });

        if (!login.Success || login.Data == null || string.IsNullOrWhiteSpace(login.Data.AccessToken))
        {
            return StatusCode(500, "Cannot generate admin token");
        }

        return Content(login.Data.AccessToken, "text/plain");
    }

    /// <summary>
    /// Đăng ký tài khoản mới
    /// </summary>
    /// <param name="request">Thông tin đăng ký</param>
    /// <returns>Thông tin user đã tạo</returns>
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        // Sau khi đăng ký thành công, tự động đăng nhập user
        var loginRequest = new LoginRequest
        {
            Email = request.Email,
            Password = request.Password
        };
        
        var loginResult = await _authService.LoginAsync(loginRequest);
        if (!loginResult.Success)
        {
            // Nếu login thất bại, vẫn trả về user đã tạo nhưng không có token
            return Ok(new ApiResponse<LoginResponse>
            {
                Success = true,
                Message = "Đăng ký thành công. Vui lòng đăng nhập.",
                Data = new LoginResponse
                {
                    AccessToken = "",
                    RefreshToken = "",
                    ExpiresAt = 0,
                    User = result.Data!
                }
            });
        }

        return Ok(loginResult);
    }

    /// <summary>
    /// Gửi thông tin định danh (CMND/CCCD) để bắt đầu KYC
    /// </summary>
    [HttpPost("kyc/identity")]
    [Authorize]
    public ActionResult<SubmitIdentityResponse> SubmitIdentity([FromBody] SubmitIdentityRequest request)
    {
        // Stub: chấp nhận và trả trạng thái Pending cùng mã tham chiếu
        return Ok(new SubmitIdentityResponse
        {
            Accepted = true,
            ReferenceId = Guid.NewGuid().ToString("N"),
            Status = KycStatus.Pending,
            Message = "Thông tin định danh đã được ghi nhận, đang chờ xác minh"
        });
    }

    /// <summary>
    /// Upload ảnh bằng lái xe (dùng multipart/form-data)
    /// </summary>
    [HttpPost("kyc/license/upload")]
    [Authorize]
    [RequestSizeLimit(20_000_000)] // 20MB
    public async Task<ActionResult<UploadLicenseResponse>> UploadLicense([FromForm] UploadLicenseRequest meta, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new UploadLicenseResponse
            {
                Accepted = false,
                Message = "Tệp tải lên trống hoặc không hợp lệ"
            });
        }

        // Stub: bỏ qua lưu trữ; chỉ trả kết quả
        await Task.CompletedTask;

        return Ok(new UploadLicenseResponse
        {
            Accepted = true,
            ReferenceId = Guid.NewGuid().ToString("N"),
            Message = "Bằng lái đã được ghi nhận, đang chờ xác minh"
        });
    }

    /// <summary>
    /// Lấy trạng thái KYC hiện tại của người dùng
    /// </summary>
    [HttpGet("kyc/status")]
    [Authorize]
    public ActionResult<KycStatusResponse> GetKycStatus()
    {
        // Stub: trả Pending mặc định
        return Ok(new KycStatusResponse
        {
            Status = KycStatus.Pending,
            Message = "Hồ sơ đang được xử lý"
        });
    }

    /// <summary>
    /// Làm mới access token bằng refresh token
    /// </summary>
    /// <param name="request">Refresh token</param>
    /// <returns>Access token và refresh token mới</returns>
    [HttpPost("refresh-token")]
    public async Task<ActionResult<ApiResponse<RefreshTokenResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin profile của user hiện tại
    /// </summary>
    /// <returns>Thông tin user</returns>
    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetProfile()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized(new ApiResponse<UserDto>
            {
                Success = false,
                Message = "Token không hợp lệ",
                Errors = new List<string> { "InvalidToken" }
            });
        }

        var result = await _authService.GetUserProfileAsync(userId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đăng xuất khỏi hệ thống
    /// </summary>
    /// <returns>Kết quả đăng xuất</returns>
    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> Logout()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized(new ApiResponse<bool>
            {
                Success = false,
                Message = "Token không hợp lệ",
                Errors = new List<string> { "InvalidToken" }
            });
        }

        var result = await _authService.LogoutAsync(userId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra trạng thái đăng nhập
    /// </summary>
    /// <returns>Thông tin user hiện tại</returns>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized(new ApiResponse<UserDto>
            {
                Success = false,
                Message = "Token không hợp lệ",
                Errors = new List<string> { "InvalidToken" }
            });
        }

        var result = await _authService.GetUserProfileAsync(userId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đổi mật khẩu
    /// </summary>
    /// <param name="request">Thông tin đổi mật khẩu</param>
    /// <returns>Kết quả đổi mật khẩu</returns>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized(new ApiResponse<bool>
            {
                Success = false,
                Message = "Token không hợp lệ",
                Errors = new List<string> { "InvalidToken" }
            });
        }

        var result = await _authService.ChangePasswordAsync(userId, request);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách session đang hoạt động của user
    /// </summary>
    [HttpGet("sessions")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<List<SessionDto>>>> GetSessions()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized();
        }

        var sessions = await _authService.GetActiveSessionsAsync(userId);
        var sessionDtos = sessions.Select(s => new SessionDto
        {
            Id = s.Id,
            IpAddress = s.IpAddress,
            UserAgent = s.UserAgent,
            LoginAt = s.LoginAt,
            LastActivityAt = s.LastActivityAt,
            ExpiresAt = s.ExpiresAt,
            Status = s.Status.ToString()
        }).ToList();

        return Ok(new ApiResponse<List<SessionDto>>
        {
            Success = true,
            Data = sessionDtos
        });
    }

    /// <summary>
    /// Thu hồi một session cụ thể
    /// </summary>
    [HttpPost("sessions/{sessionId}/revoke")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> RevokeSession(int sessionId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized();
        }

        var result = await _authService.RevokeSessionAsync(sessionId, userId);
        return Ok(result);
    }

    /// <summary>
    /// Thu hồi tất cả sessions (trừ session hiện tại)
    /// </summary>
    [HttpPost("sessions/revoke-all")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> RevokeAllSessions()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized();
        }

        var result = await _authService.RevokeAllSessionsAsync(userId);
        return Ok(result);
    }
}

public class SessionDto
{
    public int Id { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime LoginAt { get; set; }
    public DateTime LastActivityAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string Status { get; set; } = string.Empty;
}
