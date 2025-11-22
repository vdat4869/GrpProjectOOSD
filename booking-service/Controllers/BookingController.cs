using BookingService.DTOs;
using BookingService.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;
using BookingService.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

/// <summary>
/// Controller xử lý các API endpoints liên quan đến booking (đặt chỗ)
/// Route: /api/Bookings
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _service;              // Service xử lý business logic cho booking
    private readonly IWebHostEnvironment _env;              // Thông tin về môi trường hosting (Development/Production)
    private readonly BookingDbContext _context;             // Database context để truy cập database trực tiếp
    private readonly ILogger<BookingsController> _logger;  // Logger để ghi log

    /// <summary>
    /// Constructor - Dependency Injection
    /// </summary>
    public BookingsController(IBookingService service, IWebHostEnvironment env, BookingDbContext context, ILogger<BookingsController> logger)
    {
        _service = service;
        _env = env;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Lấy lịch trình của tất cả các xe (vehicles)
    /// GET /api/Bookings/schedules
    /// </summary>
    /// <returns>Danh sách lịch trình của các xe</returns>
    [HttpGet("schedules")]
    public async Task<ActionResult<IEnumerable<VehicleScheduleResponse>>> GetSchedules()
    {
        // Tự động kiểm tra và cập nhật các booking có trạng thái NoShow trước khi trả về lịch
        await _service.CheckAndUpdateNoShowBookingsAsync();
        return Ok(await _service.GetVehicleSchedulesAsync());
    }

    /// <summary>
    /// Lấy tất cả các booking
    /// GET /api/Bookings/allBooking
    /// </summary>
    /// <returns>Danh sách tất cả các booking</returns>
    [HttpGet("allBooking")]
    public async Task<ActionResult<IEnumerable<BookingResponse>>> GetAll()
    {
        // Tự động kiểm tra và cập nhật các booking có trạng thái NoShow trước khi trả về danh sách
        await _service.CheckAndUpdateNoShowBookingsAsync();
        return Ok(await _service.GetAllBookingsAsync());
    }

    /// <summary>
    /// Lấy danh sách tất cả các xe (vehicles) đang hoạt động
    /// GET /api/Bookings/vehicles
    /// </summary>
    /// <returns>Danh sách các xe đang active</returns>
    [HttpGet("vehicles")]
    public async Task<ActionResult<IEnumerable<VehicleDto>>> GetVehicles()
    {
        // Lấy tất cả các xe có IsActive = true từ database
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

    /// <summary>
    /// Tạo mới một xe (vehicle)
    /// POST /api/Bookings/vehicles
    /// </summary>
    /// <param name="dto">Thông tin xe cần tạo</param>
    /// <returns>Thông tin xe vừa tạo</returns>
    [HttpPost("vehicles")]
    public async Task<ActionResult<VehicleDto>> CreateVehicle([FromBody] CreateVehicleDto dto)
    {
        try
        {
            // Kiểm tra xem đã có xe với tên tương tự chưa (không phân biệt hoa thường)
            var existingVehicle = await _context.Vehicles
                .FirstOrDefaultAsync(v => v.Name.ToLower() == dto.Name.ToLower());
            
            // Nếu đã tồn tại, trả về thông tin xe đó thay vì tạo mới
            if (existingVehicle != null)
            {
                return Ok(new VehicleDto
                {
                    Id = existingVehicle.Id,
                    Name = existingVehicle.Name,
                    IsActive = existingVehicle.IsActive
                });
            }

            // Tạo mới vehicle entity
            var vehicle = new BookingService.Models.Vehicle
            {
                Name = dto.Name,
                IsActive = dto.IsActive
            };
            
            // Thêm vào database và lưu thay đổi
            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync();

            // Trả về thông tin xe vừa tạo với status code 201 Created
            return CreatedAtAction(nameof(GetVehicles), new { id = vehicle.Id }, new VehicleDto
            {
                Id = vehicle.Id,
                Name = vehicle.Name,
                IsActive = vehicle.IsActive
            });
        }
        catch (Exception ex)
        {
            // Log lỗi và trả về status code 500
            _logger.LogError(ex, "Error creating vehicle: {Message}", ex.Message);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Tạo mới một booking (đặt chỗ)
    /// POST /api/Bookings/createBooking
    /// </summary>
    /// <param name="request">Thông tin booking cần tạo (VehicleId, CoOwnerId, StartTime, EndTime)</param>
    /// <returns>Thông tin booking vừa tạo</returns>
    [HttpPost("createBooking")]
    public async Task<ActionResult<BookingResponse>> Create(CreateBookingRequest request)
    {
        try
        {
            // Log thông tin booking đang được tạo
            _logger.LogInformation("Creating booking: VehicleId={VehicleId}, CoOwnerId={CoOwnerId}, StartTime={StartTime}, EndTime={EndTime}",
                request.VehicleId, request.CoOwnerId, request.StartTime, request.EndTime);

            // Đảm bảo có dữ liệu seed cho môi trường development
            var seed = await EnsureDevSeedAsync();
            
            // Nếu CoOwnerId không hợp lệ (<= 0), sử dụng giá trị seed
            if (request.CoOwnerId <= 0) 
            {
                _logger.LogInformation("CoOwnerId is 0 or negative, using seed value: {CoOwnerId}", seed.coOwnerId);
                request.CoOwnerId = seed.coOwnerId;
            }
            
            // Nếu VehicleId không hợp lệ (<= 0), sử dụng giá trị seed
            if (request.VehicleId <= 0) 
            {
                _logger.LogInformation("VehicleId is 0 or negative, using seed value: {VehicleId}", seed.vehicleId);
                request.VehicleId = seed.vehicleId;
            }

            // Gọi service để tạo booking
            var result = await _service.CreateBookingAsync(request);
            
            // Kiểm tra kết quả
            if (result == null) 
            {
                _logger.LogWarning("CreateBookingAsync returned null result");
                return BadRequest(new { error = "Cannot create booking.", message = "Service returned null result." });
            }
            
            // Log thành công và trả về booking vừa tạo
            _logger.LogInformation("Booking created successfully: BookingId={BookingId}", result.Id);
            return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
        }
        catch (Exception ex)
        {
            // Log lỗi chi tiết và trả về thông tin lỗi
            _logger.LogError(ex, "Error creating booking: {Message}. StackTrace: {StackTrace}", 
                ex.Message, ex.StackTrace);
            return StatusCode(500, new { 
                error = ex.Message, 
                details = ex.InnerException?.Message,
                // Chỉ hiển thị stack trace trong môi trường development
                stackTrace = _env.IsDevelopment() ? ex.StackTrace : null
            });
        }
    }

    /// <summary>
    /// Lấy lịch sử booking của một co-owner
    /// GET /api/Bookings/history/{coOwnerId}
    /// </summary>
    /// <param name="coOwnerId">ID của co-owner</param>
    /// <returns>Danh sách lịch sử booking của co-owner</returns>
    [HttpGet("history/{coOwnerId}")]
    public async Task<IActionResult> GetHistory(int coOwnerId)
    {
        var history = await _service.GetBookingHistoryAsync(coOwnerId);
        return Ok(history);
    }

    /// <summary>
    /// Cập nhật thông tin booking
    /// PUT /api/Bookings/edit/{id}
    /// </summary>
    /// <param name="id">ID của booking cần cập nhật</param>
    /// <param name="request">Thông tin mới của booking (StartTime, EndTime, Note, etc.)</param>
    /// <returns>Thông tin booking sau khi cập nhật</returns>
    [HttpPut("edit/{id}")]
    public async Task<ActionResult<BookingResponse>> Update(int id, UpdateBookingRequest request)
    {
        try
        {
            // Log thông tin booking đang được cập nhật
            _logger.LogInformation("Updating booking: BookingId={BookingId}, StartTime={StartTime}, EndTime={EndTime}",
                id, request.StartTime, request.EndTime);

            // Gọi service để cập nhật booking
            var result = await _service.UpdateBookingAsync(id, request);
            
            // Kiểm tra kết quả
            if (result == null)
            {
                _logger.LogWarning("UpdateBookingAsync returned null for booking {BookingId}", id);
                return BadRequest(new { error = "Cannot update booking.", message = "Booking not found or cannot be updated." });
            }
            
            // Log thành công và trả về booking đã cập nhật
            _logger.LogInformation("Booking updated successfully: BookingId={BookingId}", result.Id);
            return Ok(result);
        }
        catch (Exception ex)
        {
            // Log lỗi và trả về thông tin lỗi
            _logger.LogError(ex, "Error updating booking {BookingId}: {Message}. StackTrace: {StackTrace}", 
                id, ex.Message, ex.StackTrace);
            return StatusCode(500, new { 
                error = ex.Message, 
                details = ex.InnerException?.Message,
                stackTrace = _env.IsDevelopment() ? ex.StackTrace : null
            });
        }
    }

    /// <summary>
    /// Cập nhật trạng thái của booking
    /// PATCH /api/Bookings/{id}/status
    /// </summary>
    /// <param name="id">ID của booking cần cập nhật trạng thái</param>
    /// <param name="request">Request chứa trạng thái mới (Pending, Confirmed, Approved, InProgress, Completed, Cancelled, NoShow)</param>
    /// <returns>Thông tin booking sau khi cập nhật trạng thái</returns>
    [HttpPatch("{id}/status")]
    public async Task<ActionResult<BookingResponse>> UpdateStatus(int id, [FromBody] UpdateBookingStatusRequest request)
    {
        try
        {
            // Gọi service để cập nhật trạng thái
            var result = await _service.UpdateBookingStatusAsync(id, request.Status);
            
            // Nếu không tìm thấy booking, trả về 404
            if (result == null) return NotFound();
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            // Trạng thái không hợp lệ, trả về 400 Bad Request
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            // Log lỗi và trả về 500
            _logger.LogError(ex, "Error updating booking status {BookingId}: {Message}", id, ex.Message);
            return StatusCode(500, new { 
                error = ex.Message, 
                details = ex.InnerException?.Message,
                stackTrace = _env.IsDevelopment() ? ex.StackTrace : null
            });
        }
    }

    /// <summary>
    /// Hủy booking (chuyển trạng thái sang Cancelled)
    /// DELETE /api/Bookings/editStatus{id}
    /// </summary>
    /// <param name="id">ID của booking cần hủy</param>
    /// <returns>NoContent nếu thành công</returns>
    [HttpDelete("editStatus{id}")]
    public async Task<IActionResult> Cancel(int id)
    {
        try
        {
            // Gọi service để hủy booking
            var success = await _service.CancelBookingAsync(id);
            
            // Nếu không tìm thấy booking, trả về 404
            if (!success) return NotFound();
            
            // Trả về 204 No Content nếu thành công
            return NoContent();
        }
        catch (Exception ex)
        {
            // Log lỗi và trả về 500
            _logger.LogError(ex, "Error cancelling booking {BookingId}: {Message}", id, ex.Message);
            return StatusCode(500, new { 
                error = ex.Message, 
                details = ex.InnerException?.Message,
                stackTrace = _env.IsDevelopment() ? ex.StackTrace : null
            });
        }
    }
    
    /// <summary>
    /// Xóa booking khỏi database
    /// DELETE /api/Bookings/remove/{id}
    /// </summary>
    /// <param name="id">ID của booking cần xóa</param>
    /// <returns>Thông báo xóa thành công</returns>
    [HttpDelete("remove/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            // Gọi service để xóa booking
            await _service.DeleteBookingAsync(id);
            return Ok(new { message = "Booking đã bị xóa." });
        }
        catch (Exception ex)
        {
            // Trả về 404 nếu không tìm thấy booking
            return NotFound(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Endpoint chỉ dành cho development: Tạo booking không cần authentication
    /// POST /api/Bookings/dev-create
    /// Chỉ hoạt động trong môi trường Development
    /// </summary>
    /// <param name="request">Thông tin booking cần tạo</param>
    /// <returns>Thông tin booking vừa tạo</returns>
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

    /// <summary>
    /// Endpoint chỉ dành cho development: Tạo booking qua GET request (không cần authentication)
    /// GET /api/Bookings/dev-create?coOwnerId=1&vehicleId=1&startTime=...&endTime=...
    /// Chỉ hoạt động trong môi trường Development
    /// </summary>
    /// <param name="coOwnerId">ID của co-owner</param>
    /// <param name="vehicleId">ID của vehicle</param>
    /// <param name="startTime">Thời gian bắt đầu (optional, mặc định là UTC now)</param>
    /// <param name="endTime">Thời gian kết thúc (optional, mặc định là UTC now + 1 giờ)</param>
    /// <returns>Thông tin booking vừa tạo</returns>
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
    /// Tạo QR code cho booking
    /// GET /api/Bookings/{id}/qr-code
    /// QR code được sử dụng để check-in khi sử dụng xe
    /// </summary>
    /// <param name="id">ID của booking cần tạo QR code</param>
    /// <returns>QR code dưới dạng string hoặc base64 image</returns>
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
    /// Check-in cho booking (nhận xe)
    /// POST /api/Bookings/{id}/check-in
    /// Yêu cầu QR code và chữ ký số để xác thực
    /// </summary>
    /// <param name="id">ID của booking</param>
    /// <param name="request">Request chứa QR code và digital signature</param>
    /// <returns>Thông tin check-in thành công</returns>
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
    /// Check-out cho booking (trả xe)
    /// POST /api/Bookings/{id}/check-out
    /// Yêu cầu thông tin quãng đường đã đi và chi phí
    /// </summary>
    /// <param name="id">ID của booking</param>
    /// <param name="request">Request chứa distance (km) và cost (chi phí)</param>
    /// <returns>Thông tin check-out thành công</returns>
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

    /// <summary>
    /// Kiểm tra và cập nhật các booking có trạng thái NoShow (không đến nhận xe)
    /// POST /api/Bookings/check-no-show
    /// Có thể gọi thủ công hoặc được gọi tự động bởi background service
    /// </summary>
    /// <returns>Thông báo hoàn thành kiểm tra</returns>
    [HttpPost("check-no-show")]
    public async Task<ActionResult<object>> CheckNoShow()
    {
        await _service.CheckAndUpdateNoShowBookingsAsync();
        return Ok(new { message = "NoShow check completed" });
    }

    /// <summary>
    /// Helper method: Đảm bảo có dữ liệu seed (vehicle và co-owner) cho môi trường development
    /// Nếu chưa có, sẽ tạo mới
    /// </summary>
    /// <returns>Tuple chứa vehicleId và coOwnerId</returns>
    private async Task<(int vehicleId, int coOwnerId)> EnsureDevSeedAsync()
    {
        // Kiểm tra và tạo vehicle nếu chưa có
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

        // Kiểm tra và tạo co-owner nếu chưa có
        var coOwner = await _context.CoOwners.FirstOrDefaultAsync();
        if (coOwner == null)
        {
            coOwner = new BookingService.Models.CoOwner
            {
                Name = "Dev CoOwner",
                OwnershipRatio = 50m,  // Tỷ lệ sở hữu 50%
                UsageCount = 0         // Số lần sử dụng ban đầu = 0
            };
            _context.CoOwners.Add(coOwner);
            await _context.SaveChangesAsync();
        }

        return (vehicle.Id, coOwner.Id);
    }

    /// <summary>
    /// Helper method: Đảm bảo booking đã được confirm
    /// Nếu booking chưa confirm, sẽ tự động chuyển sang trạng thái "Confirmed"
    /// </summary>
    /// <param name="bookingId">ID của booking</param>
    /// <returns>Booking entity đã được confirm</returns>
    private async Task<BookingService.Models.Booking> EnsureBookingConfirmedAsync(int bookingId)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null)
        {
            throw new InvalidOperationException($"Booking {bookingId} không tồn tại.");
        }
        
        // Nếu chưa confirm, tự động confirm
        if (booking.Status != "Confirmed")
        {
            booking.Status = "Confirmed";
            await _context.SaveChangesAsync();
        }
        return booking;
    }
}
