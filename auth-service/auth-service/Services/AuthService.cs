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
/// Định nghĩa các phương thức xử lý authentication và authorization
/// </summary>
public interface IAuthService
{
    /// <summary>Đăng nhập user và trả về JWT tokens</summary>
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null);
    
    /// <summary>Đăng ký user mới</summary>
    Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequest request);
    
    /// <summary>Làm mới access token bằng refresh token</summary>
    Task<ApiResponse<RefreshTokenResponse>> RefreshTokenAsync(RefreshTokenRequest request);
    
    /// <summary>Lấy thông tin profile của user</summary>
    Task<ApiResponse<UserDto>> GetUserProfileAsync(int userId);
    
    /// <summary>Đăng xuất user (xóa refresh token và revoke session)</summary>
    Task<ApiResponse<bool>> LogoutAsync(int userId);
    
    /// <summary>Đổi mật khẩu của user</summary>
    Task<ApiResponse<bool>> ChangePasswordAsync(int userId, ChangePasswordRequest request);
    
    /// <summary>Lấy danh sách sessions đang hoạt động</summary>
    Task<List<Models.UserSession>> GetActiveSessionsAsync(int userId);
    
    /// <summary>Thu hồi một session cụ thể</summary>
    Task<ApiResponse<bool>> RevokeSessionAsync(int sessionId, int userId);
    
    /// <summary>Thu hồi tất cả sessions của user</summary>
    Task<ApiResponse<bool>> RevokeAllSessionsAsync(int userId);
}

/// <summary>
/// Service xử lý authentication và authorization
/// Chứa business logic cho đăng nhập, đăng ký, quản lý tokens, sessions, v.v.
/// </summary>
public class AuthService : IAuthService
{
    // Repository để truy cập dữ liệu User
    private readonly IUserRepository _userRepository;
    
    // Service để tạo và validate JWT tokens
    private readonly IJwtService _jwtService;
    
    // AutoMapper để map giữa Entity và DTO
    private readonly IMapper _mapper;
    
    // DbContext để truy cập database (cho các thao tác đặc biệt như tạo Role)
    private readonly AuthDbContext _dbContext;
    
    // HttpClientFactory để gọi các service khác (như ownership-service)
    private readonly IHttpClientFactory _httpClientFactory;
    
    // Logger để ghi log
    private readonly ILogger<AuthService> _logger;
    
    // Configuration để đọc cấu hình từ appsettings.json
    private readonly IConfiguration _configuration;
    
    // RabbitMQ Service để publish events (optional - có thể null)
    private readonly Infrastructure.IRabbitMQService? _rabbitMQService;
    
    // Session Service để quản lý user sessions (optional - có thể null)
    private readonly ISessionService? _sessionService;

    /// <summary>
    /// Constructor - Dependency Injection
    /// </summary>
    public AuthService(
        IUserRepository userRepository, 
        IJwtService jwtService, 
        IMapper mapper, 
        AuthDbContext dbContext,
        IHttpClientFactory httpClientFactory,
        ILogger<AuthService> logger,
        IConfiguration configuration,
        Infrastructure.IRabbitMQService? rabbitMQService = null,
        ISessionService? sessionService = null)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _mapper = mapper;
        _dbContext = dbContext;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
        _rabbitMQService = rabbitMQService;
        _sessionService = sessionService;
    }

    /// <summary>
    /// Đăng nhập user
    /// Xác thực email và password, tạo JWT tokens và session
    /// </summary>
    /// <param name="request">Thông tin đăng nhập (Email và Password)</param>
    /// <param name="ipAddress">IP address của client (để lưu vào session)</param>
    /// <param name="userAgent">User-Agent của client (để lưu vào session)</param>
    /// <returns>JWT tokens và thông tin user nếu đăng nhập thành công</returns>
    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null)
    {
        try
        {
            // Tìm user theo email trong database
            var user = await _userRepository.GetByEmailAsync(request.Email);
            
            // Kiểm tra user có tồn tại không
            if (user == null)
            {
                return new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng",
                    Errors = new List<string> { "UserNotFound" }
                };
            }

            // Kiểm tra tài khoản có bị khóa không
            if (!user.IsActive)
            {
                return new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Tài khoản đã bị khóa",
                    Errors = new List<string> { "AccountDisabled" }
                };
            }

            // Xác thực mật khẩu bằng BCrypt
            // BCrypt tự động so sánh password plaintext với password hash
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return new ApiResponse<LoginResponse>
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng",
                    Errors = new List<string> { "InvalidPassword" }
                };
            }

            // Tạo JWT access token (có thời gian hết hạn ngắn - 60 phút)
            var accessToken = _jwtService.GenerateAccessToken(user);
            
            // Tạo refresh token (random string, lưu trong database)
            var refreshToken = _jwtService.GenerateRefreshToken();

            // Lưu refresh token vào database để có thể validate sau này
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7); // Refresh token hết hạn sau 7 ngày
            await _userRepository.UpdateAsync(user);

            // Tạo session để theo dõi các thiết bị đang đăng nhập
            // Session lưu thông tin IP, User-Agent, thời gian đăng nhập, v.v.
            if (_sessionService != null)
            {
                try
                {
                    await _sessionService.CreateSessionAsync(user.Id, refreshToken, ipAddress, userAgent);
                }
                catch (Exception ex)
                {
                    // Log lỗi nhưng không block quá trình đăng nhập
                    _logger.LogWarning(ex, "Failed to create session for user {UserId}", user.Id);
                }
            }

            // Map User entity sang UserDto để trả về cho client
            var userDto = _mapper.Map<UserDto>(user);
            // Thêm danh sách roles vào DTO
            userDto.Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

            // Tạo response với tokens và thông tin user
            var response = new LoginResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(60).ToUnixTimeSeconds(), // Unix timestamp
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
            // Log lỗi và trả về response lỗi
            _logger.LogError(ex, "Error during login for email {Email}", request.Email);
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
    /// Tạo user mới, gán role CoOwner mặc định, và tự động tạo CoOwner record trong ownership-service
    /// </summary>
    /// <param name="request">Thông tin đăng ký (Email, Password, FirstName, LastName, PhoneNumber, v.v.)</param>
    /// <returns>Thông tin user đã tạo nếu đăng ký thành công</returns>
    public async Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequest request)
    {
        try
        {
            // Kiểm tra email đã tồn tại chưa (email phải unique)
            if (await _userRepository.EmailExistsAsync(request.Email))
            {
                return new ApiResponse<UserDto>
                {
                    Success = false,
                    Message = "Email đã được sử dụng",
                    Errors = new List<string> { "EmailExists" }
                };
            }

            // Hash password bằng BCrypt trước khi lưu vào database
            // BCrypt tự động thêm salt và hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Tạo user entity mới
            var user = new User
            {
                Email = request.Email,
                PasswordHash = passwordHash,
                FirstName = request.FirstName,
                LastName = request.LastName,
                PhoneNumber = request.PhoneNumber
            };

            // Lưu user vào database
            // Repository sẽ tự động set CreatedAt, UpdatedAt, IsActive = true
            var createdUser = await _userRepository.CreateAsync(user);

            // Gán role CoOwner mặc định cho user mới đăng ký
            // Tìm role CoOwner trong database
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

            // Gán role CoOwner cho user mới
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

            // Tự động tạo CoOwner record trong ownership-service
            // Để đồng bộ dữ liệu giữa auth-service và ownership-service
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

            // Publish UserCreated event lên RabbitMQ
            // Các service khác có thể subscribe event này để xử lý (ví dụ: gửi email chào mừng)
            if (_rabbitMQService != null)
            {
                try
                {
                    var userCreatedEvent = new Infrastructure.UserCreatedEvent
                    {
                        UserId = createdUser.Id,
                        Email = createdUser.Email ?? string.Empty,
                        FirstName = createdUser.FirstName ?? string.Empty,
                        LastName = createdUser.LastName ?? string.Empty,
                        PhoneNumber = createdUser.PhoneNumber,
                        Roles = userDto.Roles ?? new List<string>(),
                        CreatedAt = DateTime.UtcNow
                    };
                    // Publish event lên queue "user.created"
                    _rabbitMQService.PublishEvent("user.created", userCreatedEvent);
                    _logger.LogInformation("Published UserCreated event for user {UserId}", createdUser.Id);
                }
                catch (Exception ex)
                {
                    // Log lỗi nhưng không block quá trình register
                    // Event có thể được publish sau bằng cách khác
                    _logger.LogWarning(ex, "Failed to publish UserCreated event for user {UserId}. User registration succeeded.", createdUser.Id);
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
    /// Khi access token hết hạn, client có thể dùng refresh token để lấy access token mới
    /// mà không cần đăng nhập lại
    /// </summary>
    /// <param name="request">Refresh token hiện tại</param>
    /// <returns>Access token và refresh token mới nếu refresh token hợp lệ</returns>
    public async Task<ApiResponse<RefreshTokenResponse>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        try
        {
            // Lấy claims từ refresh token (không validate lifetime vì token có thể đã expired)
            // Refresh token thực chất là access token cũ, nhưng ta lưu nó trong database để validate
            var principal = _jwtService.GetPrincipalFromExpiredToken(request.RefreshToken);
            var userIdClaim = principal?.FindFirst(ClaimTypes.NameIdentifier);
            
            // Kiểm tra token có chứa UserId không
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                return new ApiResponse<RefreshTokenResponse>
                {
                    Success = false,
                    Message = "Token không hợp lệ",
                    Errors = new List<string> { "InvalidToken" }
                };
            }

            // Tìm user trong database
            var user = await _userRepository.GetByIdAsync(userId);
            
            // Validate refresh token:
            // 1. User phải tồn tại
            // 2. Refresh token trong database phải khớp với refresh token trong request
            // 3. Refresh token chưa hết hạn
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

            // Tạo access token mới (60 phút)
            var newAccessToken = _jwtService.GenerateAccessToken(user);
            
            // Tạo refresh token mới (7 ngày)
            var newRefreshToken = _jwtService.GenerateRefreshToken();

            // Cập nhật refresh token mới vào database
            // Rotation: mỗi lần refresh, ta tạo refresh token mới để tăng tính bảo mật
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
    /// Đăng xuất user (xóa refresh token và revoke session)
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

            // Revoke current session if SessionService available
            if (_sessionService != null && !string.IsNullOrEmpty(user.RefreshToken))
            {
                try
                {
                    var session = await _sessionService.GetSessionByRefreshTokenAsync(user.RefreshToken);
                    if (session != null)
                    {
                        await _sessionService.RevokeSessionAsync(session.Id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to revoke session during logout for user {UserId}", userId);
                }
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
    /// Tự động tạo CoOwner record trong ownership-service khi user đăng ký với role CoOwner
    /// Để đồng bộ dữ liệu giữa auth-service và ownership-service
    /// </summary>
    /// <param name="user">User entity đã được tạo</param>
    private async Task CreateCoOwnerInOwnershipServiceAsync(User user)
    {
        try
        {
            // Lấy Gateway URL từ configuration (hoặc dùng default)
            var gatewayUrl = _configuration["GatewayUrl"] ?? "http://localhost:8000";
            
            // Tạo HttpClient từ factory (để tận dụng connection pooling)
            var httpClient = _httpClientFactory.CreateClient();
            
            // Set timeout ngắn (5 giây) để không block quá trình register quá lâu
            httpClient.Timeout = TimeSpan.FromSeconds(5);

            // Tạo full name từ FirstName và LastName
            var fullName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrEmpty(fullName))
            {
                // Nếu không có tên, dùng email
                fullName = user.Email ?? "Unknown";
            }

            // Tạo DTO để gửi đến ownership-service
            // identityCardNumber tạm thời dùng GUID (user sẽ cập nhật sau khi KYC)
            var createCoOwnerDto = new
            {
                userId = user.Id.ToString(),
                fullName = fullName,
                email = user.Email,
                identityCardNumber = $"TEMP-{Guid.NewGuid():N}".Substring(0, 20).ToUpperInvariant(),
                phoneNumber = user.PhoneNumber,
                address = (string?)null
            };

            // Serialize DTO thành JSON
            var jsonContent = JsonSerializer.Serialize(createCoOwnerDto);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            // Gọi internal endpoint của ownership-service qua gateway
            // Endpoint này không cần authentication (service-to-service call)
            var response = await httpClient.PostAsync($"{gatewayUrl}/api/ownership/coowners/internal", content);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully created CoOwner record in ownership service for user {UserId} ({Email})", user.Id, user.Email);
            }
            else
            {
                // Log lỗi và throw exception
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to create CoOwner record in ownership service for user {UserId}. Status: {Status}, Error: {Error}", 
                    user.Id, response.StatusCode, errorContent);
                throw new Exception($"Ownership service returned {response.StatusCode}: {errorContent}");
            }
        }
        catch (TaskCanceledException)
        {
            // Timeout khi gọi ownership-service
            _logger.LogWarning("Timeout when creating CoOwner record in ownership service for user {UserId}", user.Id);
            throw;
        }
        catch (HttpRequestException ex)
        {
            // Lỗi network (không kết nối được đến ownership-service)
            _logger.LogWarning(ex, "Network error when creating CoOwner record in ownership service for user {UserId}", user.Id);
            throw;
        }
        catch (Exception ex)
        {
            // Lỗi khác
            _logger.LogError(ex, "Error creating CoOwner record in ownership service for user {UserId}", user.Id);
            throw;
        }
    }

    /// <summary>
    /// Lấy danh sách session đang hoạt động
    /// </summary>
    public async Task<List<Models.UserSession>> GetActiveSessionsAsync(int userId)
    {
        if (_sessionService == null)
            return new List<Models.UserSession>();

        return await _sessionService.GetActiveSessionsAsync(userId);
    }

    /// <summary>
    /// Thu hồi một session
    /// </summary>
    public async Task<ApiResponse<bool>> RevokeSessionAsync(int sessionId, int userId)
    {
        if (_sessionService == null)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Session service not available"
            };
        }

        var session = await _sessionService.GetActiveSessionsAsync(userId);
        if (!session.Any(s => s.Id == sessionId))
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Session not found or not owned by user"
            };
        }

        await _sessionService.RevokeSessionAsync(sessionId);
        return new ApiResponse<bool>
        {
            Success = true,
            Message = "Session revoked successfully",
            Data = true
        };
    }

    /// <summary>
    /// Thu hồi tất cả sessions
    /// </summary>
    public async Task<ApiResponse<bool>> RevokeAllSessionsAsync(int userId)
    {
        if (_sessionService == null)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Session service not available"
            };
        }

        await _sessionService.RevokeAllSessionsAsync(userId);
        
        // Also clear refresh token
        var user = await _userRepository.GetByIdAsync(userId);
        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userRepository.UpdateAsync(user);
        }

        return new ApiResponse<bool>
        {
            Success = true,
            Message = "All sessions revoked successfully",
            Data = true
        };
    }
}
