using AuthService.DTOs;
using AuthService.Models;
using AuthService.Repositories;
using AuthService.Data;
using AutoMapper;
using BCrypt.Net;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;

namespace AuthService.Services;

/// <summary>
/// Interface cho Auth Service
/// </summary>
public interface IAuthService
{
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequest request);
    Task<ApiResponse<RefreshTokenResponse>> RefreshTokenAsync(RefreshTokenRequest request);
    Task<ApiResponse<UserDto>> GetUserProfileAsync(int userId);
    Task<ApiResponse<bool>> LogoutAsync(int userId);
    Task<ApiResponse<bool>> ChangePasswordAsync(int userId, ChangePasswordRequest request);
}

/// <summary>
/// Service xử lý authentication và authorization
/// </summary>
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly IMapper _mapper;
    private readonly AuthDbContext _dbContext;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AuthService> _logger;
    private readonly IConfiguration _configuration;

    public AuthService(
        IUserRepository userRepository, 
        IJwtService jwtService, 
        IMapper mapper, 
        AuthDbContext dbContext,
        IHttpClientFactory httpClientFactory,
        ILogger<AuthService> logger,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _mapper = mapper;
        _dbContext = dbContext;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Đăng nhập user
    /// </summary>
    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request)
    {
        try
        {
            // Tìm user theo email
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                return new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng",
                    Errors = new List<string> { "UserNotFound" }
                };
            }

            // Kiểm tra tài khoản có active không
            if (!user.IsActive)
            {
                return new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Tài khoản đã bị khóa",
                    Errors = new List<string> { "AccountDisabled" }
                };
            }

            // Kiểm tra mật khẩu
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng",
                    Errors = new List<string> { "InvalidPassword" }
                };
            }

            // Tạo tokens
            var accessToken = _jwtService.GenerateAccessToken(user);
            var refreshToken = _jwtService.GenerateRefreshToken();

            // Cập nhật refresh token vào database
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7); // Refresh token hết hạn sau 7 ngày
            await _userRepository.UpdateAsync(user);

            // Tạo response
            var userDto = _mapper.Map<UserDto>(user);
            userDto.Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            var response = new LoginResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(60).ToUnixTimeSeconds(),
                User = userDto
            };

            return new ApiResponse<LoginResponse>
            {
                Success = true,
                Message = "Đăng nhập thành công",
                Data = response
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<LoginResponse>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi đăng nhập",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Đăng ký user mới
    /// </summary>
    public async Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequest request)
    {
        try
        {
            // Kiểm tra email đã tồn tại chưa
            if (await _userRepository.EmailExistsAsync(request.Email))
            {
                return new ApiResponse<UserDto>
                {
                    Success = false,
                    Message = "Email đã được sử dụng",
                    Errors = new List<string> { "EmailExists" }
                };
            }

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Tạo user mới
            var user = new User
            {
                Email = request.Email,
                PasswordHash = passwordHash,
                FirstName = request.FirstName,
                LastName = request.LastName,
                PhoneNumber = request.PhoneNumber
            };

            // Lưu user vào database
            var createdUser = await _userRepository.CreateAsync(user);

            // Gán role CoOwner mặc định cho user mới
            // Tìm hoặc tạo role CoOwner
            var coOwnerRole = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Name == "CoOwner");
            if (coOwnerRole == null)
            {
                // Nếu chưa có role CoOwner, tạo mới
                coOwnerRole = new Role
                {
                    Name = "CoOwner",
                    Description = "Chủ sở hữu đồng sở hữu xe",
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.Roles.Add(coOwnerRole);
                await _dbContext.SaveChangesAsync();
            }

            // Gán role cho user
            var userRole = new UserRole
            {
                UserId = createdUser.Id,
                RoleId = coOwnerRole.Id,
                AssignedAt = DateTime.UtcNow
            };
            _dbContext.UserRoles.Add(userRole);
            await _dbContext.SaveChangesAsync();

            // Load lại user với roles để map đúng
            var userWithRoles = await _userRepository.GetByIdAsync(createdUser.Id);
            var userDto = _mapper.Map<UserDto>(userWithRoles);
            
            // Đảm bảo roles được map đúng
            if (userDto.Roles == null || userDto.Roles.Count == 0)
            {
                userDto.Roles = new List<string> { "CoOwner" };
            }

            // Tự động tạo CoOwner record trong ownership service nếu user có role CoOwner
            if (userDto.Roles.Any(r => r.Equals("CoOwner", StringComparison.OrdinalIgnoreCase)))
            {
                try
                {
                    await CreateCoOwnerInOwnershipServiceAsync(createdUser);
                }
                catch (Exception ex)
                {
                    // Log lỗi nhưng không block quá trình register
                    // CoOwner record có thể được tạo sau bằng sync endpoint
                    _logger.LogWarning(ex, "Failed to create CoOwner record in ownership service for user {UserId}. User registration succeeded.", createdUser.Id);
                }
            }

            return new ApiResponse<UserDto>
            {
                Success = true,
                Message = "Đăng ký thành công",
                Data = userDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<UserDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi đăng ký",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Làm mới access token
    /// </summary>
    public async Task<ApiResponse<RefreshTokenResponse>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        try
        {
            // Lấy claims từ expired token
            var principal = _jwtService.GetPrincipalFromExpiredToken(request.RefreshToken);
            var userIdClaim = principal?.FindFirst(ClaimTypes.NameIdentifier);
            
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                return new ApiResponse<RefreshTokenResponse>
                {
                    Success = false,
                    Message = "Token không hợp lệ",
                    Errors = new List<string> { "InvalidToken" }
                };
            }

            // Tìm user
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null || user.RefreshToken != request.RefreshToken || 
                user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                return new ApiResponse<RefreshTokenResponse>
                {
                    Success = false,
                    Message = "Refresh token không hợp lệ hoặc đã hết hạn",
                    Errors = new List<string> { "InvalidRefreshToken" }
                };
            }

            // Tạo tokens mới
            var newAccessToken = _jwtService.GenerateAccessToken(user);
            var newRefreshToken = _jwtService.GenerateRefreshToken();

            // Cập nhật refresh token mới
            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userRepository.UpdateAsync(user);

            var response = new RefreshTokenResponse
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(60).ToUnixTimeSeconds()
            };

            return new ApiResponse<RefreshTokenResponse>
            {
                Success = true,
                Message = "Làm mới token thành công",
                Data = response
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<RefreshTokenResponse>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi làm mới token",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy thông tin profile của user
    /// </summary>
    public async Task<ApiResponse<UserDto>> GetUserProfileAsync(int userId)
    {
        try
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return new ApiResponse<UserDto>
                {
                    Success = false,
                    Message = "Không tìm thấy user",
                    Errors = new List<string> { "UserNotFound" }
                };
            }

            var userDto = _mapper.Map<UserDto>(user);
            userDto.Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            return new ApiResponse<UserDto>
            {
                Success = true,
                Message = "Lấy thông tin user thành công",
                Data = userDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<UserDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy thông tin user",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Đăng xuất user (xóa refresh token)
    /// </summary>
    public async Task<ApiResponse<bool>> LogoutAsync(int userId)
    {
        try
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Không tìm thấy user",
                    Errors = new List<string> { "UserNotFound" }
                };
            }

            // Xóa refresh token
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userRepository.UpdateAsync(user);

            return new ApiResponse<bool>
            {
                Success = true,
                Message = "Đăng xuất thành công",
                Data = true
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi đăng xuất",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Đổi mật khẩu user
    /// </summary>
    public async Task<ApiResponse<bool>> ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        try
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Không tìm thấy user",
                    Errors = new List<string> { "UserNotFound" }
                };
            }

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Mật khẩu hiện tại không đúng",
                    Errors = new List<string> { "InvalidCurrentPassword" }
                };
            }

            // Check if new password is different from current password
            if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Mật khẩu mới phải khác mật khẩu hiện tại",
                    Errors = new List<string> { "NewPasswordSameAsCurrent" }
                };
            }

            // Hash new password
            var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.PasswordHash = newPasswordHash;
            user.UpdatedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(user);

            return new ApiResponse<bool>
            {
                Success = true,
                Message = "Đổi mật khẩu thành công",
                Data = true
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi đổi mật khẩu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Tự động tạo CoOwner record trong ownership service khi user đăng ký với role CoOwner
    /// </summary>
    private async Task CreateCoOwnerInOwnershipServiceAsync(User user)
    {
        try
        {
            var gatewayUrl = _configuration["GatewayUrl"] ?? "http://localhost:8000";
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(5); // Short timeout để không block register

            var fullName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrEmpty(fullName))
            {
                fullName = user.Email ?? "Unknown";
            }

            var createCoOwnerDto = new
            {
                userId = user.Id.ToString(),
                fullName = fullName,
                email = user.Email,
                identityCardNumber = $"TEMP-{Guid.NewGuid():N}".Substring(0, 20).ToUpperInvariant(),
                phoneNumber = user.PhoneNumber,
                address = (string?)null
            };

            var jsonContent = JsonSerializer.Serialize(createCoOwnerDto);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            // Use internal endpoint for service-to-service call
            var response = await httpClient.PostAsync($"{gatewayUrl}/api/ownership/coowners/internal", content);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully created CoOwner record in ownership service for user {UserId} ({Email})", user.Id, user.Email);
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to create CoOwner record in ownership service for user {UserId}. Status: {Status}, Error: {Error}", 
                    user.Id, response.StatusCode, errorContent);
                throw new Exception($"Ownership service returned {response.StatusCode}: {errorContent}");
            }
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Timeout when creating CoOwner record in ownership service for user {UserId}", user.Id);
            throw;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Network error when creating CoOwner record in ownership service for user {UserId}", user.Id);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating CoOwner record in ownership service for user {UserId}", user.Id);
            throw;
        }
    }
}
