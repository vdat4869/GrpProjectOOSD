using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.DTOs;
using FluentValidation;

namespace PaymentService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentMethodsController : ControllerBase
    {
        private readonly PaymentDbContext _context;
        private readonly IValidator<CreatePaymentMethodDto> _createPaymentMethodValidator;
        private readonly IValidator<UpdatePaymentMethodDto> _updatePaymentMethodValidator;

        public PaymentMethodsController(
            PaymentDbContext context,
            IValidator<CreatePaymentMethodDto> createPaymentMethodValidator,
            IValidator<UpdatePaymentMethodDto> updatePaymentMethodValidator)
        {
            _context = context;
            _createPaymentMethodValidator = createPaymentMethodValidator;
            _updatePaymentMethodValidator = updatePaymentMethodValidator;
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<List<PaymentMethodDto>>> GetPaymentMethodsByUser(string userId)
        {
            // Support both GUID and numeric userId (from auth service)
            if (!Guid.TryParse(userId, out var userGuid))
            {
                // userId is not a GUID (might be a numeric ID from auth service)
                // Return empty list as we cannot find payment methods without GUID
                return Ok(new List<PaymentMethodDto>());
            }
            
            var paymentMethods = await _context.PaymentMethods
                .Where(pm => pm.UserId == userGuid && !pm.IsDeleted)
                .OrderByDescending(pm => pm.IsDefault)
                .ThenBy(pm => pm.CreatedAt)
                .ToListAsync();

            var result = paymentMethods.Select(pm => new PaymentMethodDto
            {
                Id = pm.Id,
                UserId = pm.UserId,
                MethodType = pm.MethodType,
                AccountNumber = pm.AccountNumber,
                AccountName = pm.AccountName,
                BankName = pm.BankName,
                BankCode = pm.BankCode,
                IsDefault = pm.IsDefault,
                IsActive = pm.IsActive,
                CreatedAt = pm.CreatedAt
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentMethodDto>> GetPaymentMethod(Guid id)
        {
            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == id && !pm.IsDeleted);

            if (paymentMethod == null)
                return NotFound();

            var result = new PaymentMethodDto
            {
                Id = paymentMethod.Id,
                UserId = paymentMethod.UserId,
                MethodType = paymentMethod.MethodType,
                AccountNumber = paymentMethod.AccountNumber,
                AccountName = paymentMethod.AccountName,
                BankName = paymentMethod.BankName,
                BankCode = paymentMethod.BankCode,
                IsDefault = paymentMethod.IsDefault,
                IsActive = paymentMethod.IsActive,
                CreatedAt = paymentMethod.CreatedAt
            };

            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<PaymentMethodDto>> CreatePaymentMethod([FromBody] CreatePaymentMethodRequest request)
        {
            // Handle both Guid and string userId from frontend
            Guid userGuid;
            if (request.UserId is Guid guid)
            {
                userGuid = guid;
            }
            else if (request.UserId is string userIdString)
            {
                if (!Guid.TryParse(userIdString, out userGuid))
                {
                    return BadRequest(new { message = "Invalid userId format. Must be a valid GUID." });
                }
            }
            else
            {
                return BadRequest(new { message = "UserId is required" });
            }

            var dto = new CreatePaymentMethodDto
            {
                UserId = userGuid,
                MethodType = request.MethodType,
                AccountNumber = request.AccountNumber,
                AccountName = request.AccountName,
                BankName = request.BankName,
                BankCode = request.BankCode,
                IsDefault = request.IsDefault
            };

            var validationResult = await _createPaymentMethodValidator.ValidateAsync(dto);
            if (!validationResult.IsValid)
                return BadRequest(validationResult.Errors);

            // If this is set as default, unset other defaults for this user
            if (dto.IsDefault)
            {
                var existingDefaults = await _context.PaymentMethods
                    .Where(pm => pm.UserId == dto.UserId && pm.IsDefault && !pm.IsDeleted)
                    .ToListAsync();

                foreach (var existingDefault in existingDefaults)
                {
                    existingDefault.IsDefault = false;
                    existingDefault.UpdatedAt = DateTime.UtcNow;
                }
            }

            var paymentMethod = new Models.PaymentMethod
            {
                UserId = dto.UserId,
                MethodType = dto.MethodType,
                AccountNumber = dto.AccountNumber,
                AccountName = dto.AccountName,
                BankName = dto.BankName,
                BankCode = dto.BankCode,
                IsDefault = dto.IsDefault,
                IsActive = true
            };

            _context.PaymentMethods.Add(paymentMethod);
            await _context.SaveChangesAsync();

            var result = new PaymentMethodDto
            {
                Id = paymentMethod.Id,
                UserId = paymentMethod.UserId,
                MethodType = paymentMethod.MethodType,
                AccountNumber = paymentMethod.AccountNumber,
                AccountName = paymentMethod.AccountName,
                BankName = paymentMethod.BankName,
                BankCode = paymentMethod.BankCode,
                IsDefault = paymentMethod.IsDefault,
                IsActive = paymentMethod.IsActive,
                CreatedAt = paymentMethod.CreatedAt
            };

            return CreatedAtAction(nameof(GetPaymentMethod), new { id = paymentMethod.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PaymentMethodDto>> UpdatePaymentMethod(Guid id, [FromBody] UpdatePaymentMethodDto dto)
        {
            var validationResult = await _updatePaymentMethodValidator.ValidateAsync(dto);
            if (!validationResult.IsValid)
                return BadRequest(validationResult.Errors);

            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == id && !pm.IsDeleted);

            if (paymentMethod == null)
                return NotFound();

            // If this is set as default, unset other defaults for this user
            if (dto.IsDefault == true)
            {
                var existingDefaults = await _context.PaymentMethods
                    .Where(pm => pm.UserId == paymentMethod.UserId && pm.IsDefault && pm.Id != id && !pm.IsDeleted)
                    .ToListAsync();

                foreach (var existingDefault in existingDefaults)
                {
                    existingDefault.IsDefault = false;
                    existingDefault.UpdatedAt = DateTime.UtcNow;
                }
            }

            if (!string.IsNullOrEmpty(dto.AccountName)) paymentMethod.AccountName = dto.AccountName;
            if (!string.IsNullOrEmpty(dto.BankName)) paymentMethod.BankName = dto.BankName;
            if (!string.IsNullOrEmpty(dto.BankCode)) paymentMethod.BankCode = dto.BankCode;
            if (dto.IsDefault.HasValue) paymentMethod.IsDefault = dto.IsDefault.Value;
            if (dto.IsActive.HasValue) paymentMethod.IsActive = dto.IsActive.Value;

            paymentMethod.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var result = new PaymentMethodDto
            {
                Id = paymentMethod.Id,
                UserId = paymentMethod.UserId,
                MethodType = paymentMethod.MethodType,
                AccountNumber = paymentMethod.AccountNumber,
                AccountName = paymentMethod.AccountName,
                BankName = paymentMethod.BankName,
                BankCode = paymentMethod.BankCode,
                IsDefault = paymentMethod.IsDefault,
                IsActive = paymentMethod.IsActive,
                CreatedAt = paymentMethod.CreatedAt
            };

            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeletePaymentMethod(Guid id)
        {
            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == id && !pm.IsDeleted);

            if (paymentMethod == null)
                return NotFound();

            paymentMethod.IsDeleted = true;
            paymentMethod.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    // Request DTO to handle both Guid and string userId
    public class CreatePaymentMethodRequest
    {
        public object UserId { get; set; } = null!; // Can be Guid or string
        public string MethodType { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string? AccountName { get; set; }
        public string? BankName { get; set; }
        public string? BankCode { get; set; }
        public bool IsDefault { get; set; } = false;
    }
}
