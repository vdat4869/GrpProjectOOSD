using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.DTOs;
using PaymentService.Models;
using PaymentService.Validators;
using FluentValidation;
using System.Security.Claims;

namespace PaymentService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CompanyPaymentRequestsController : ControllerBase
    {
        private readonly PaymentDbContext _context;
        private readonly ILogger<CompanyPaymentRequestsController> _logger;
        private readonly IValidator<CreateCompanyPaymentRequestDto> _validator;

        public CompanyPaymentRequestsController(
            PaymentDbContext context,
            ILogger<CompanyPaymentRequestsController> logger,
            IValidator<CreateCompanyPaymentRequestDto> validator)
        {
            _context = context;
            _logger = logger;
            _validator = validator;
        }

        /// <summary>
        /// Create a new company payment request
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<CompanyPaymentRequestDto>> CreateCompanyPaymentRequest(
            [FromBody] CreateCompanyPaymentRequestDto dto)
        {
            try
            {
                // Validate using FluentValidation
                var validationResult = await _validator.ValidateAsync(dto);
                if (!validationResult.IsValid)
                {
                    return BadRequest(validationResult.Errors);
                }

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { message = "User not found" });
                }

                var request = new CompanyPaymentRequest
                {
                    UserId = userId,
                    ServiceType = dto.ServiceType,
                    Amount = dto.Amount,
                    Description = dto.Description,
                    QrCode = dto.QrCode,
                    ImageUrls = dto.ImageUrls != null ? System.Text.Json.JsonSerializer.Serialize(dto.ImageUrls) : null,
                    Status = CompanyPaymentRequestStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.CompanyPaymentRequests.Add(request);
                await _context.SaveChangesAsync();

                var result = MapToDto(request);
                return CreatedAtAction(nameof(GetCompanyPaymentRequest), new { id = request.Id }, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating company payment request");
                return StatusCode(500, new { message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get company payment request by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<CompanyPaymentRequestDto>> GetCompanyPaymentRequest(Guid id)
        {
            var request = await _context.CompanyPaymentRequests
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

            if (request == null)
                return NotFound();

            return Ok(MapToDto(request));
        }

        /// <summary>
        /// Get company payment requests by user
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<List<CompanyPaymentRequestDto>>> GetCompanyPaymentRequestsByUser(
            Guid userId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var requests = await _context.CompanyPaymentRequests
                .Where(r => r.UserId == userId && !r.IsDeleted)
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = requests.Select(MapToDto).ToList();
            return Ok(result);
        }

        /// <summary>
        /// Get current user's company payment requests
        /// </summary>
        [HttpGet("my-requests")]
        public async Task<ActionResult<List<CompanyPaymentRequestDto>>> GetMyCompanyPaymentRequests(
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "User not found" });
            }

            var query = _context.CompanyPaymentRequests
                .Where(r => r.UserId == userId && !r.IsDeleted);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<CompanyPaymentRequestStatus>(status, true, out var statusEnum))
            {
                query = query.Where(r => r.Status == statusEnum);
            }

            var requests = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = requests.Select(MapToDto).ToList();
            return Ok(result);
        }

        /// <summary>
        /// Get all company payment requests (Admin/Staff only)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<List<CompanyPaymentRequestDto>>> GetAllCompanyPaymentRequests(
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.CompanyPaymentRequests.Where(r => !r.IsDeleted);

            if (!string.IsNullOrEmpty(status) && Enum.TryParse<CompanyPaymentRequestStatus>(status, true, out var statusEnum))
            {
                query = query.Where(r => r.Status == statusEnum);
            }

            var requests = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = requests.Select(MapToDto).ToList();
            return Ok(result);
        }

        /// <summary>
        /// Update company payment request (Admin/Staff only)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult<CompanyPaymentRequestDto>> UpdateCompanyPaymentRequest(
            Guid id,
            [FromBody] UpdateCompanyPaymentRequestDto dto)
        {
            var request = await _context.CompanyPaymentRequests
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

            if (request == null)
                return NotFound();

            if (!string.IsNullOrEmpty(dto.Status) && Enum.TryParse<CompanyPaymentRequestStatus>(dto.Status, true, out var statusEnum))
            {
                request.Status = statusEnum;
                if (statusEnum == CompanyPaymentRequestStatus.Approved || 
                    statusEnum == CompanyPaymentRequestStatus.Completed ||
                    statusEnum == CompanyPaymentRequestStatus.Refunded)
                {
                    request.ProcessedAt = DateTime.UtcNow;
                }
            }

            if (dto.CompanyNotes != null)
                request.CompanyNotes = dto.CompanyNotes;

            if (dto.RefundAmount.HasValue)
                request.RefundAmount = dto.RefundAmount;

            if (!string.IsNullOrEmpty(dto.RefundTransactionId))
                request.RefundTransactionId = dto.RefundTransactionId;

            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(MapToDto(request));
        }

        /// <summary>
        /// Cancel company payment request (User can cancel their own pending requests)
        /// </summary>
        [HttpPost("{id}/cancel")]
        public async Task<ActionResult<CompanyPaymentRequestDto>> CancelCompanyPaymentRequest(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "User not found" });
            }

            var request = await _context.CompanyPaymentRequests
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

            if (request == null)
                return NotFound();

            // User can only cancel their own requests
            if (request.UserId != userId)
            {
                return Forbid();
            }

            // Only pending requests can be cancelled
            if (request.Status != CompanyPaymentRequestStatus.Pending)
            {
                return BadRequest(new { message = "Only pending requests can be cancelled" });
            }

            request.Status = CompanyPaymentRequestStatus.Cancelled;
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(MapToDto(request));
        }

        /// <summary>
        /// Delete company payment request (Admin/Staff only, soft delete)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<ActionResult> DeleteCompanyPaymentRequest(Guid id)
        {
            var request = await _context.CompanyPaymentRequests
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

            if (request == null)
                return NotFound();

            request.IsDeleted = true;
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private CompanyPaymentRequestDto MapToDto(CompanyPaymentRequest request)
        {
            List<string>? imageUrls = null;
            if (!string.IsNullOrEmpty(request.ImageUrls))
            {
                try
                {
                    imageUrls = System.Text.Json.JsonSerializer.Deserialize<List<string>>(request.ImageUrls);
                }
                catch
                {
                    imageUrls = new List<string>();
                }
            }

            return new CompanyPaymentRequestDto
            {
                Id = request.Id,
                UserId = request.UserId,
                ServiceType = request.ServiceType,
                Amount = request.Amount,
                Description = request.Description,
                QrCode = request.QrCode,
                ImageUrls = imageUrls,
                Status = request.Status.ToString(),
                CompanyNotes = request.CompanyNotes,
                ProcessedAt = request.ProcessedAt,
                RefundAmount = request.RefundAmount,
                RefundTransactionId = request.RefundTransactionId,
                CreatedAt = request.CreatedAt,
                UpdatedAt = request.UpdatedAt ?? request.CreatedAt
            };
        }
    }
}

