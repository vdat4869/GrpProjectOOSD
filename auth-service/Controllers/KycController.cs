using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using AuthService.Data;
using AuthService.Models;
using AuthService.DTOs;
using System.Security.Claims;
using System.Text.Json;

namespace AuthService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class KycController : ControllerBase
{
    private readonly AuthDbContext _db;
    private readonly IHttpClientFactory? _httpClientFactory;
    private readonly IConfiguration? _configuration;
    private readonly ILogger<KycController>? _logger;

    public KycController(
        AuthDbContext db,
        IHttpClientFactory? httpClientFactory = null,
        IConfiguration? configuration = null,
        ILogger<KycController>? logger = null)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Nộp giấy tờ định danh (CMND/CCCD) - Chỉ CoOwner
    /// </summary>
    [HttpPost("identity")]
    public async Task<ActionResult<ApiResponse<SubmitIdentityResponse>>> SubmitIdentity([FromBody] SubmitIdentityRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            // Chỉ CoOwner mới được submit KYC
            if (!await IsCoOwnerAsync(userId.Value))
            {
                return StatusCode(403, new ApiResponse<SubmitIdentityResponse>
                {
                    Success = false,
                    Message = "Chỉ CoOwner mới cần thực hiện KYC. Admin và Staff đã được xác minh qua quy trình tuyển dụng/quản trị."
                });
            }

            // Check if already exists
            var existing = await _db.IdentityDocuments
                .FirstOrDefaultAsync(d => d.UserId == userId.Value && d.IsActive);

            if (existing != null && existing.VerificationStatus == VerificationStatus.Approved)
            {
                return BadRequest(new ApiResponse<SubmitIdentityResponse>
                {
                    Success = false,
                    Message = "Giấy tờ định danh đã được duyệt rồi"
                });
            }

            IdentityDocument document;
            if (existing != null)
            {
                // Update existing
                document = existing;
            }
            else
            {
                document = new IdentityDocument
                {
                    UserId = userId.Value,
                    CreatedAt = DateTime.UtcNow
                };
                _db.IdentityDocuments.Add(document);
            }

            document.DocumentType = IdentityDocumentType.CitizenId;
            document.DocumentNumber = request.NationalIdNumber;
            document.FullName = $"{request.FirstName} {request.LastName}";
            
            if (DateTime.TryParse(request.DateOfBirth, out var dob))
                document.DateOfBirth = dob;
            
            document.VerificationStatus = VerificationStatus.Pending;
            document.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            var response = new SubmitIdentityResponse
            {
                Accepted = true,
                ReferenceId = document.Id.ToString(),
                Status = KycStatus.Pending,
                Message = "Giấy tờ định danh đã được ghi nhận, đang chờ xác minh"
            };

            return Ok(new ApiResponse<SubmitIdentityResponse> { Success = true, Data = response });
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<SubmitIdentityResponse>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    /// <summary>
    /// Upload ảnh bằng lái xe - Chỉ CoOwner
    /// </summary>
    [HttpPost("license/upload")]
    [RequestSizeLimit(20_000_000)] // 20MB
    public async Task<ActionResult<ApiResponse<UploadLicenseResponse>>> UploadLicense(
        [FromForm] UploadLicenseRequest meta,
        IFormFile? file)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            // Chỉ CoOwner mới được upload license
            if (!await IsCoOwnerAsync(userId.Value))
            {
                return StatusCode(403, new ApiResponse<UploadLicenseResponse>
                {
                    Success = false,
                    Message = "Chỉ CoOwner mới cần thực hiện KYC. Admin và Staff đã được xác minh qua quy trình tuyển dụng/quản trị."
                });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new ApiResponse<UploadLicenseResponse>
                {
                    Success = false,
                    Message = "File không hợp lệ"
                });
            }

            // Save file (stub: in production, save to blob storage)
            var fileName = $"license_{userId}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine("uploads", "licenses", fileName);
            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
            
            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            var existing = await _db.DrivingLicenses
                .FirstOrDefaultAsync(l => l.UserId == userId.Value && l.IsActive);

            DrivingLicense license;
            if (existing != null)
            {
                license = existing;
            }
            else
            {
                license = new DrivingLicense
                {
                    UserId = userId.Value,
                    CreatedAt = DateTime.UtcNow
                };
                _db.DrivingLicenses.Add(license);
            }

            license.LicenseNumber = meta.LicenseNumber;
            license.ImagePath = filePath;
            license.VerificationStatus = VerificationStatus.Pending;
            
            if (DateTime.TryParse(meta.IssuedDate, out var issued))
                license.IssueDate = issued;
            if (DateTime.TryParse(meta.ExpiryDate, out var expiry))
                license.ExpiryDate = expiry;

            license.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var response = new UploadLicenseResponse
            {
                Accepted = true,
                ReferenceId = license.Id.ToString(),
                Message = "Bằng lái đã được ghi nhận, đang chờ xác minh"
            };

            return Ok(new ApiResponse<UploadLicenseResponse> { Success = true, Data = response });
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse<UploadLicenseResponse>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    /// <summary>
    /// Lấy trạng thái KYC của user hiện tại - Admin/Staff trả về Approved tự động
    /// </summary>
    [HttpGet("status")]
    public async Task<ActionResult<ApiResponse<KycStatusResponse>>> GetKycStatus()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new ApiResponse<KycStatusResponse>
                {
                    Success = false,
                    Message = "Không thể xác định người dùng. Vui lòng đăng nhập lại."
                });
            }

            // Admin và Staff không cần KYC - trả về Approved tự động
            if (!await IsCoOwnerAsync(userId.Value))
            {
                return Ok(new ApiResponse<KycStatusResponse>
                {
                    Success = true,
                    Data = new KycStatusResponse
                    {
                        Status = KycStatus.Approved,
                        Message = "Admin và Staff đã được xác minh qua quy trình tuyển dụng/quản trị"
                    }
                });
            }

            // Kiểm tra database connection
            if (!await _db.Database.CanConnectAsync())
            {
                return StatusCode(500, new ApiResponse<KycStatusResponse>
                {
                    Success = false,
                    Message = "Không thể kết nối database"
                });
            }

            IdentityDocument? identity = null;
            DrivingLicense? license = null;

            try
            {
                identity = await _db.IdentityDocuments
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.UserId == userId.Value && d.IsActive);

                license = await _db.DrivingLicenses
                    .AsNoTracking()
                    .FirstOrDefaultAsync(l => l.UserId == userId.Value && l.IsActive);
            }
            catch
            {
                // Nếu table chưa tồn tại hoặc có lỗi query, trả về status NotSubmitted
                return Ok(new ApiResponse<KycStatusResponse>
                {
                    Success = true,
                    Data = new KycStatusResponse 
                    { 
                        Status = KycStatus.NotSubmitted, 
                        Message = "Chưa nộp giấy tờ" 
                    }
                });
            }

            var status = KycStatus.NotSubmitted;
            var message = "Chưa nộp giấy tờ";

            if (identity != null || license != null)
            {
                var identityStatus = identity?.VerificationStatus ?? VerificationStatus.Pending;
                var licenseStatus = license?.VerificationStatus ?? VerificationStatus.Pending;

                if (identityStatus == VerificationStatus.Approved && licenseStatus == VerificationStatus.Approved)
                {
                    status = KycStatus.Approved;
                    message = "KYC đã được duyệt";
                }
                else if (identityStatus == VerificationStatus.Rejected || licenseStatus == VerificationStatus.Rejected)
                {
                    status = KycStatus.Rejected;
                    message = "KYC đã bị từ chối";
                }
                else
                {
                    status = KycStatus.Pending;
                    message = "KYC đang chờ xử lý";
                }
            }

            return Ok(new ApiResponse<KycStatusResponse>
            {
                Success = true,
                Data = new KycStatusResponse { Status = status, Message = message }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse<KycStatusResponse>
            {
                Success = false,
                Message = $"Lỗi khi lấy trạng thái KYC: {ex.Message}",
                Errors = new List<string> { ex.GetType().Name }
            });
        }
    }

    /// <summary>
    /// Admin: Lấy danh sách tất cả KYC requests của CoOwner
    /// </summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<List<KycRequestDto>>>> GetAllKycRequests(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var query = _db.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .Where(u => u.UserRoles.Any(ur => ur.Role.Name == "CoOwner"));

            var users = await query.ToListAsync();
            var userIds = users.Select(u => u.Id).ToList();

            var identityQuery = _db.IdentityDocuments
                .Where(d => userIds.Contains(d.UserId) && d.IsActive);

            var licenseQuery = _db.DrivingLicenses
                .Where(l => userIds.Contains(l.UserId) && l.IsActive);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<VerificationStatus>(status, true, out var statusEnum))
            {
                identityQuery = identityQuery.Where(d => d.VerificationStatus == statusEnum);
                licenseQuery = licenseQuery.Where(l => l.VerificationStatus == statusEnum);
            }

            var identities = await identityQuery
                .Include(d => d.User)
                .OrderByDescending(d => d.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var licenses = await licenseQuery
                .Include(l => l.User)
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<KycRequestDto>();

            foreach (var identity in identities)
            {
                var license = licenses.FirstOrDefault(l => l.UserId == identity.UserId);
                result.Add(new KycRequestDto
                {
                    UserId = identity.UserId,
                    UserEmail = identity.User?.Email ?? "",
                    UserName = identity.User != null ? $"{identity.User.FirstName} {identity.User.LastName}".Trim() : "",
                    IdentityDocumentId = identity.Id,
                    IdentityStatus = identity.VerificationStatus.ToString(),
                    IdentityDocumentNumber = identity.DocumentNumber,
                    IdentityFullName = identity.FullName,
                    LicenseId = license?.Id,
                    LicenseStatus = license?.VerificationStatus.ToString() ?? "NotSubmitted",
                    LicenseNumber = license?.LicenseNumber,
                    CreatedAt = identity.CreatedAt,
                    UpdatedAt = identity.UpdatedAt
                });
            }

            return Ok(new ApiResponse<List<KycRequestDto>> { Success = true, Data = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse<List<KycRequestDto>>
            {
                Success = false,
                Message = $"Lỗi khi lấy danh sách KYC: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Admin: Xác thực Identity Document của CoOwner
    /// </summary>
    [HttpPost("identity/{documentId}/verify")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> VerifyIdentity(
        int documentId,
        [FromBody] VerifyKycRequest request)
    {
        try
        {
            var document = await _db.IdentityDocuments
                .FirstOrDefaultAsync(d => d.Id == documentId && d.IsActive);

            if (document == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Không tìm thấy giấy tờ" });

            // Kiểm tra user có phải CoOwner không
            var user = await _db.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == document.UserId);

            if (user == null || !user.UserRoles.Any(ur => ur.Role.Name == "CoOwner"))
            {
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Chỉ có thể xác thực KYC của CoOwner" });
            }

            if (request.Status == "Approved")
            {
                document.VerificationStatus = VerificationStatus.Approved;
            }
            else if (request.Status == "Rejected")
            {
                document.VerificationStatus = VerificationStatus.Rejected;
            }
            else
            {
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Status không hợp lệ" });
            }

            document.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Nếu được approve, cập nhật co-owner trong ownership-service
            if (request.Status == "Approved" && _httpClientFactory != null && _configuration != null)
            {
                try
                {
                    await UpdateCoOwnerAfterKycApprovalAsync(user.Id.ToString(), document.DocumentNumber, null);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to update co-owner in ownership-service after KYC approval for user {UserId}", user.Id);
                    // Không throw exception để không block KYC verification
                }
            }

            return Ok(new ApiResponse<object> { Success = true, Message = "Xác thực thành công" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = $"Lỗi khi xác thực: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Admin: Xác thực Driving License của CoOwner
    /// </summary>
    [HttpPost("license/{licenseId}/verify")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> VerifyLicense(
        int licenseId,
        [FromBody] VerifyKycRequest request)
    {
        try
        {
            var license = await _db.DrivingLicenses
                .FirstOrDefaultAsync(l => l.Id == licenseId && l.IsActive);

            if (license == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Không tìm thấy bằng lái" });

            // Kiểm tra user có phải CoOwner không
            var user = await _db.Users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == license.UserId);

            if (user == null || !user.UserRoles.Any(ur => ur.Role.Name == "CoOwner"))
            {
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Chỉ có thể xác thực KYC của CoOwner" });
            }

            if (request.Status == "Approved")
            {
                license.VerificationStatus = VerificationStatus.Approved;
            }
            else if (request.Status == "Rejected")
            {
                license.VerificationStatus = VerificationStatus.Rejected;
            }
            else
            {
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Status không hợp lệ" });
            }

            license.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // Nếu được approve, cập nhật co-owner trong ownership-service
            if (request.Status == "Approved" && _httpClientFactory != null && _configuration != null)
            {
                try
                {
                    await UpdateCoOwnerAfterKycApprovalAsync(user.Id.ToString(), null, license.LicenseNumber);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to update co-owner in ownership-service after driving license approval for user {UserId}", user.Id);
                    // Không throw exception để không block KYC verification
                }
            }

            return Ok(new ApiResponse<object> { Success = true, Message = "Xác thực thành công" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = $"Lỗi khi xác thực: {ex.Message}"
            });
        }
    }

    /// <summary>
    /// Kiểm tra user có phải CoOwner không
    /// </summary>
    private async Task<bool> IsCoOwnerAsync(int userId)
    {
        var user = await _db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return false;

        return user.UserRoles.Any(ur => ur.Role.Name == "CoOwner" || ur.Role.Name == "co-owner");
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            return userId;
        return null;
    }

    /// <summary>
    /// Cập nhật co-owner trong ownership-service sau khi KYC được approve
    /// </summary>
    private async Task UpdateCoOwnerAfterKycApprovalAsync(string userId, string? identityCardNumber, string? drivingLicenseNumber)
    {
        if (_httpClientFactory == null || _configuration == null)
            return;

        try
        {
            var gatewayUrl = _configuration["GatewayUrl"] ?? "http://localhost:8000";
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            // Lấy co-owner theo userId
            var getCoOwnerResponse = await httpClient.GetAsync($"{gatewayUrl}/api/ownership/coowners/user/{userId}");
            if (!getCoOwnerResponse.IsSuccessStatusCode)
            {
                _logger?.LogWarning("Co-owner not found in ownership-service for user {UserId}", userId);
                return;
            }

            var coOwnerJson = await getCoOwnerResponse.Content.ReadAsStringAsync();
            using var coOwnerDoc = JsonDocument.Parse(coOwnerJson);
            var coOwnerRoot = coOwnerDoc.RootElement;
            
            // Lấy coOwnerId từ response
            string? coOwnerId = null;
            if (coOwnerRoot.TryGetProperty("data", out var dataProp))
            {
                if (dataProp.TryGetProperty("id", out var idProp))
                {
                    coOwnerId = idProp.GetString();
                }
            }
            else if (coOwnerRoot.TryGetProperty("id", out var directIdProp))
            {
                coOwnerId = directIdProp.GetString();
            }

            if (string.IsNullOrEmpty(coOwnerId))
            {
                _logger?.LogWarning("Could not extract co-owner ID from response for user {UserId}", userId);
                return;
            }

            // Cập nhật co-owner
            var updateDto = new Dictionary<string, object?>();
            if (!string.IsNullOrEmpty(identityCardNumber))
            {
                updateDto["identityCardNumber"] = identityCardNumber;
            }
            if (!string.IsNullOrEmpty(drivingLicenseNumber))
            {
                updateDto["drivingLicenseNumber"] = drivingLicenseNumber;
            }

            if (updateDto.Count > 0)
            {
                var updateContent = new StringContent(JsonSerializer.Serialize(updateDto), System.Text.Encoding.UTF8, "application/json");
                var updateResponse = await httpClient.PutAsync($"{gatewayUrl}/api/ownership/coowners/{coOwnerId}", updateContent);
                
                if (updateResponse.IsSuccessStatusCode)
                {
                    _logger?.LogInformation("Updated co-owner {CoOwnerId} in ownership-service after KYC approval", coOwnerId);
                    
                    // Verify co-owner nếu identity document đã được approve (identity là bắt buộc)
                    // Driving license là tùy chọn, không bắt buộc để verify co-owner
                    var identityDoc = await _db.IdentityDocuments
                        .FirstOrDefaultAsync(d => d.UserId == int.Parse(userId) && d.IsActive && d.VerificationStatus == VerificationStatus.Approved);
                    
                    if (identityDoc != null)
                    {
                        // Identity đã được approve, verify co-owner
                        var verifyResponse = await httpClient.PostAsync($"{gatewayUrl}/api/ownership/coowners/{coOwnerId}/verify", null);
                        if (verifyResponse.IsSuccessStatusCode)
                        {
                            _logger?.LogInformation("Verified co-owner {CoOwnerId} in ownership-service after identity document approved", coOwnerId);
                        }
                        else
                        {
                            var errorContent = await verifyResponse.Content.ReadAsStringAsync();
                            _logger?.LogWarning("Failed to verify co-owner {CoOwnerId}: {StatusCode} - {Error}", coOwnerId, verifyResponse.StatusCode, errorContent);
                        }
                    }
                    else
                    {
                        _logger?.LogWarning("Identity document not approved yet for user {UserId}, skipping co-owner verification", userId);
                    }
                }
                else
                {
                    var errorContent = await updateResponse.Content.ReadAsStringAsync();
                    _logger?.LogWarning("Failed to update co-owner {CoOwnerId}: {StatusCode} - {Error}", coOwnerId, updateResponse.StatusCode, errorContent);
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error updating co-owner in ownership-service for user {UserId}", userId);
            throw;
        }
    }
}

