using BookingService.DTOs;
using BookingService.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;
using BookingService.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _service;
    private readonly IWebHostEnvironment _env;
    private readonly BookingDbContext _context;
    private readonly ILogger<BookingsController> _logger;

    public BookingsController(IBookingService service, IWebHostEnvironment env, BookingDbContext context, ILogger<BookingsController> logger)
    {
        _service = service;
        _env = env;
        _context = context;
        _logger = logger;
    }

    //Hiển thị lịch
    [HttpGet("schedules")]
    public async Task<ActionResult<IEnumerable<VehicleScheduleResponse>>> GetSchedules() =>
        Ok(await _service.GetVehicleSchedulesAsync());

    [HttpGet("allBooking")]
    public async Task<ActionResult<IEnumerable<BookingResponse>>> GetAll() =>
        Ok(await _service.GetAllBookingsAsync());

    [HttpGet("vehicles")]
    public async Task<ActionResult<IEnumerable<VehicleDto>>> GetVehicles()
    {
        var vehicles = await _context.Vehicles
            .Where(v => v.IsActive)
            .Select(v => new VehicleDto
            {
                Id = v.Id,
                Name = v.Name,
                IsActive = v.IsActive
            })
            .ToListAsync();
        return Ok(vehicles);
    }

    [HttpPost("createBooking")]
    public async Task<ActionResult<BookingResponse>> Create(CreateBookingRequest request)
    {
        try
        {
            _logger.LogInformation("Creating booking: VehicleId={VehicleId}, CoOwnerId={CoOwnerId}, StartTime={StartTime}, EndTime={EndTime}",
                request.VehicleId, request.CoOwnerId, request.StartTime, request.EndTime);

            var seed = await EnsureDevSeedAsync();
            if (request.CoOwnerId <= 0) 
            {
                _logger.LogInformation("CoOwnerId is 0 or negative, using seed value: {CoOwnerId}", seed.coOwnerId);
                request.CoOwnerId = seed.coOwnerId;
            }
            if (request.VehicleId <= 0) 
            {
                _logger.LogInformation("VehicleId is 0 or negative, using seed value: {VehicleId}", seed.vehicleId);
                request.VehicleId = seed.vehicleId;
            }

            var result = await _service.CreateBookingAsync(request);
            if (result == null) 
            {
                _logger.LogWarning("CreateBookingAsync returned null result");
                return BadRequest(new { error = "Cannot create booking.", message = "Service returned null result." });
            }
            
            _logger.LogInformation("Booking created successfully: BookingId={BookingId}", result.Id);
            return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating booking: {Message}. StackTrace: {StackTrace}", 
                ex.Message, ex.StackTrace);
            return StatusCode(500, new { 
                error = ex.Message, 
                details = ex.InnerException?.Message,
                stackTrace = _env.IsDevelopment() ? ex.StackTrace : null
            });
        }
    }

    [HttpPut("edit/{id}")]
    public async Task<ActionResult<BookingResponse>> Update(int id, UpdateBookingRequest request)
    {
        var result = await _service.UpdateBookingAsync(id, request);
        if (result == null) return BadRequest("Cannot update booking.");
        return Ok(result);
    }

    // [HttpPatch("{id}/status")]
    // public async Task<ActionResult<BookingResponse>> UpdateStatus(int id, [FromBody] UpdateBookingStatusRequest request)
    // {
    //     var result = await _service.UpdateBookingStatusAsync(id, request.Status);
    //     if (result == null) return NotFound();
    //     return Ok(result);
    // }

    [HttpDelete("editStatus{id}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var success = await _service.CancelBookingAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
    [HttpDelete("remove/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _service.DeleteBookingAsync(id);
            return Ok(new { message = "Booking đã bị xóa." });
        }
        catch (Exception ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    // Dev-only: create booking without auth to unblock smoke tests
    [HttpPost("dev-create")]
    [AllowAnonymous]
    public async Task<ActionResult<BookingResponse>> DevCreate([FromBody] CreateBookingRequest request)
    {
        if (!_env.IsDevelopment()) return Forbid();

        // Fallback: accept query/form values to bypass shell escaping issues
        if (request == null)
        {
            request = new CreateBookingRequest();
            if (Request.HasFormContentType)
            {
                if (int.TryParse(Request.Form["coOwnerId"].FirstOrDefault() ?? Request.Form["CoOwnerId"].FirstOrDefault(), out var formCoOwnerId))
                {
                    request.CoOwnerId = formCoOwnerId;
                }
                if (int.TryParse(Request.Form["vehicleId"].FirstOrDefault() ?? Request.Form["VehicleId"].FirstOrDefault(), out var formVehicleId))
                {
                    request.VehicleId = formVehicleId;
                }
                request.StartTime = DateTime.Parse(Request.Form["startTime"].FirstOrDefault() ?? Request.Form["StartTime"].FirstOrDefault() ?? DateTime.UtcNow.ToString("o"));
                request.EndTime = DateTime.Parse(Request.Form["endTime"].FirstOrDefault() ?? Request.Form["EndTime"].FirstOrDefault() ?? DateTime.UtcNow.AddHours(1).ToString("o"));
            }
            else
            {
                if (int.TryParse(Request.Query["coOwnerId"].FirstOrDefault() ?? Request.Query["CoOwnerId"].FirstOrDefault(), out var queryCoOwnerId))
                {
                    request.CoOwnerId = queryCoOwnerId;
                }
                if (int.TryParse(Request.Query["vehicleId"].FirstOrDefault() ?? Request.Query["VehicleId"].FirstOrDefault(), out var queryVehicleId))
                {
                    request.VehicleId = queryVehicleId;
                }
                request.StartTime = DateTime.Parse(Request.Query["startTime"].FirstOrDefault() ?? Request.Query["StartTime"].FirstOrDefault() ?? DateTime.UtcNow.ToString("o"));
                request.EndTime = DateTime.Parse(Request.Query["endTime"].FirstOrDefault() ?? Request.Query["EndTime"].FirstOrDefault() ?? DateTime.UtcNow.AddHours(1).ToString("o"));
            }
        }
        var result = await _service.CreateBookingAsync(request);
        if (result == null) return BadRequest("Cannot create booking.");
        return Ok(result);
    }

    // Dev-only GET variant
    [HttpGet("dev-create")]
    [AllowAnonymous]
    public async Task<ActionResult<BookingResponse>> DevCreateGet([FromQuery] int coOwnerId, [FromQuery] int vehicleId, [FromQuery] DateTime? startTime, [FromQuery] DateTime? endTime)
    {
        if (!_env.IsDevelopment()) return Forbid();
        var req = new CreateBookingRequest
        {
            CoOwnerId = coOwnerId,
            VehicleId = vehicleId,
            StartTime = startTime ?? DateTime.UtcNow,
            EndTime = endTime ?? DateTime.UtcNow.AddHours(1)
        };
        return await DevCreate(req);
    }
    /// <summary>
    /// Generate QR code for booking
    /// </summary>
    [HttpGet("{id}/qr-code")]
    public async Task<ActionResult<QrCodeResponse>> GenerateQrCode(int id)
    {
        try
        {
            var result = await _service.GenerateQrCodeAsync(id);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Check-in for booking (with QR code validation and digital signature)
    /// </summary>
    [HttpPost("{id}/check-in")]
    public async Task<ActionResult<CheckInResponse>> CheckIn(int id, [FromBody] CheckInRequest request)
    {
        try
        {
            var result = await _service.CheckInAsync(id, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Check-out for booking (with distance and cost)
    /// </summary>
    [HttpPost("{id}/check-out")]
    public async Task<ActionResult<CheckOutResponse>> CheckOut(int id, [FromBody] CheckOutRequest request)
    {
        try
        {
            var result = await _service.CheckOutAsync(id, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("dev-check-in")]
    [AllowAnonymous]
    public async Task<ActionResult<CheckInResponse>> DevCheckIn([FromQuery] int bookingId)
    {
        if (!_env.IsDevelopment()) return Forbid();
        var booking = await EnsureBookingConfirmedAsync(bookingId);
        var qrCode = booking.QrCode;
        if (string.IsNullOrEmpty(qrCode))
        {
            var qrResponse = await _service.GenerateQrCodeAsync(bookingId);
            qrCode = qrResponse.QrCode;
        }

        var request = new CheckInRequest
        {
            QrCode = qrCode,
            DigitalSignature = $"DEV-SIGN-{bookingId:D3}"
        };
        return await CheckIn(bookingId, request);
    }

    [HttpGet("dev-check-out")]
    [AllowAnonymous]
    public async Task<ActionResult<CheckOutResponse>> DevCheckOut([FromQuery] int bookingId, [FromQuery] decimal? distanceKm, [FromQuery] decimal? cost)
    {
        if (!_env.IsDevelopment()) return Forbid();
        var request = new CheckOutRequest
        {
            DistanceKm = distanceKm ?? 10m,
            Cost = cost ?? 100000m,
            Note = "Dev auto checkout"
        };
        return await CheckOut(bookingId, request);
    }

    [HttpGet("dev-seed")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> DevSeed()
    {
        if (!_env.IsDevelopment()) return Forbid();
        var seed = await EnsureDevSeedAsync();
        return Ok(new { vehicleId = seed.vehicleId, coOwnerId = seed.coOwnerId });
    }

    [HttpGet("dev-confirm")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> DevConfirm([FromQuery] int bookingId)
    {
        if (!_env.IsDevelopment()) return Forbid();
        var booking = await EnsureBookingConfirmedAsync(bookingId);
        var qrResponse = await _service.GenerateQrCodeAsync(bookingId);
        return Ok(new { id = booking.Id, status = booking.Status, qrCode = qrResponse.QrCode });
    }

    private async Task<(int vehicleId, int coOwnerId)> EnsureDevSeedAsync()
    {
        var vehicle = await _context.Vehicles.FirstOrDefaultAsync();
        if (vehicle == null)
        {
            vehicle = new BookingService.Models.Vehicle
            {
                Name = "Dev EV",
                IsActive = true
            };
            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();
        }

        var coOwner = await _context.CoOwners.FirstOrDefaultAsync();
        if (coOwner == null)
        {
            coOwner = new BookingService.Models.CoOwner
            {
                Name = "Dev CoOwner",
                OwnershipRatio = 50m,
                UsageCount = 0
            };
            _context.CoOwners.Add(coOwner);
            await _context.SaveChangesAsync();
        }

        return (vehicle.Id, coOwner.Id);
    }

    private async Task<BookingService.Models.Booking> EnsureBookingConfirmedAsync(int bookingId)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null)
        {
            throw new InvalidOperationException($"Booking {bookingId} không tồn tại.");
        }
        if (booking.Status != "Confirmed")
        {
            booking.Status = "Confirmed";
            await _context.SaveChangesAsync();
        }
        return booking;
    }
}
