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

    public KycController(AuthDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Nộp giấy tờ định danh (CMND/CCCD)
    /// </summary>
    [HttpPost("identity")]
    public async Task<ActionResult<ApiResponse<SubmitIdentityResponse>>> SubmitIdentity([FromBody] SubmitIdentityRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

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
    /// Upload ảnh bằng lái xe
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
    /// Lấy trạng thái KYC của user hiện tại
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

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            return userId;
        return null;
    }
}

