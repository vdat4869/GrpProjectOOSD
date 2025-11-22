using BookingService.DTOs;
using BookingService.Models;
using BookingService.Repositories;
using BookingService.Infrastructure;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace BookingService.Services
{
    /// <summary>
    /// Service implementation xử lý business logic cho booking
    /// Bao gồm: tạo, cập nhật, hủy booking, check-in/check-out, và quản lý lịch trình
    /// </summary>
    public class BookingServiceImpl : IBookingService
    {
        private readonly IBookingRepository _bookingRepository;              // Repository để truy cập dữ liệu booking
        private readonly IBookingHistoryRepository _bookingHistoryRepository;  // Repository để truy cập lịch sử booking

        private readonly IVehicleRepository _vehicleRepository;               // Repository để truy cập dữ liệu vehicle
        private readonly ICoOwnerRepository _coOwnerRepository;               // Repository để truy cập dữ liệu co-owner
        private readonly IQrCodeService _qrCodeService;                        // Service để tạo và validate QR code
        private readonly IRabbitMQService _rabbitMQService;                    // Service để publish/subscribe events qua RabbitMQ
        private readonly IAiService? _aiService;                                // Service để gọi AI service (optional)
        private readonly ILogger<BookingServiceImpl>? _logger;                 // Logger để ghi log

        /// <summary>
        /// Constructor - Dependency Injection
        /// </summary>
        public BookingServiceImpl(
            IBookingRepository bookingRepository,
            IVehicleRepository vehicleRepository,
            ICoOwnerRepository coOwnerRepository,
            IQrCodeService qrCodeService,
            IRabbitMQService rabbitMQService,
            IBookingHistoryRepository bookingHistoryRepository,
            IAiService? aiService = null,
            ILogger<BookingServiceImpl>? logger = null
            )
        {
            _bookingRepository = bookingRepository;
            _vehicleRepository = vehicleRepository;
            _coOwnerRepository = coOwnerRepository;
            _qrCodeService = qrCodeService;
            _rabbitMQService = rabbitMQService;
            _bookingHistoryRepository = bookingHistoryRepository;
            _aiService = aiService;
            _logger = logger;
        }

        /// <summary>
        /// Lấy lịch trình của tất cả các xe (vehicles) kèm thông tin booking
        /// Bao gồm: danh sách booking của mỗi xe, trạng thái xe (đang dùng hay trống)
        /// </summary>
        public async Task<IEnumerable<VehicleScheduleResponse>> GetVehicleSchedulesAsync()
        {
            var vehicles = await _vehicleRepository.GetAllAsync();
            var bookings = await _bookingRepository.GetAllAsync();
            var now = DateTime.UtcNow;

            var schedules = vehicles.Select(v =>
            {
                var vehicleBookings = bookings
                    .Where(b => b.VehicleId == v.Id)
                    .OrderBy(b => b.StartTime)
                    .Select(b => new BookingPeriod
                    {
                        StartTime = b.StartTime,
                        EndTime = b.EndTime,
                        CoOwnerName = b.CoOwner?.Name,
                        Status = b.Status,
                        Note = b.Note
                    }).ToList();

                // Xác định xe đang trống hay đang dùng
                // Xe đang dùng nếu có booking đang trong thời gian sử dụng (StartTime <= now <= EndTime)
                // và status là Confirmed, InProgress, Đã đặt, hoặc Pending (đã đặt nhưng chưa được approve)
                var isCurrentlyInUse = vehicleBookings.Any(b =>
                    b.StartTime <= now &&
                    b.EndTime >= now &&
                    (b.Status == "Confirmed" || b.Status == "Đã đặt" || b.Status == "InProgress" || b.Status == "Pending"));

                return new VehicleScheduleResponse
                {
                    VehicleId = v.Id,
                    VehicleName = v.Name,
                    IsActive = v.IsActive,
                    IsCurrentlyInUse = isCurrentlyInUse,
                    Bookings = vehicleBookings.Select(b => new BookingPeriod
                    {
                        StartTime = TimeZoneHelper.ToVietnamTime(b.StartTime),
                        EndTime = TimeZoneHelper.ToVietnamTime(b.EndTime),
                        CoOwnerName = b.CoOwnerName,
                        Status = b.Status,
                        Note = b.Note
                    }).ToList(),
                };
            });

            return schedules;
        }

        /// <summary>
        /// Lấy tất cả các booking trong hệ thống
        /// </summary>
        public async Task<IEnumerable<BookingResponse>> GetAllBookingsAsync()
        {
            var bookings = await _bookingRepository.GetAllAsync();
            return bookings.Select(b => new BookingResponse
            {
                Id = b.Id,
                VehicleId = b.VehicleId,
                VehicleName = b.Vehicle?.Name,
                CoOwnerId = b.CoOwnerId,
                CoOwnerName = b.CoOwner?.Name,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                Status = b.Status,
                Note = b.Note
            });
        }

        /// <summary>
        /// Tạo mới một booking
        /// Bao gồm các bước:
        /// 1. Validation cơ bản (thời gian, giờ hoạt động)
        /// 2. Lấy dữ liệu liên quan (vehicle, co-owner)
        /// 3. Kiểm tra trùng lịch
        /// 4. Áp dụng rule ưu tiên dựa trên ownership ratio và usage
        /// 5. Gọi AI service để kiểm tra fairness (optional)
        /// 6. Tạo booking và publish event
        /// </summary>
        /// <param name="request">Thông tin booking cần tạo</param>
        /// <returns>Thông tin booking vừa tạo, null nếu không thể tạo</returns>
        public async Task<BookingResponse?> CreateBookingAsync(CreateBookingRequest request)
        {
            // === 1. VALIDATION CƠ BẢN ===
            // Kiểm tra các điều kiện cơ bản: thời gian hợp lệ, không trong quá khứ, giờ hoạt động
            // Convert request times to VN timezone if they are in UTC
            // Frontend sends UTC time, but we need to compare with VN time
            var vnTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            
            // If StartTime is UTC (Kind == Utc), convert to VN time
            // Otherwise, assume it's already in local/VN time
            var startTime = request.StartTime;
            if (startTime.Kind == DateTimeKind.Utc)
            {
                startTime = TimeZoneInfo.ConvertTimeFromUtc(startTime, vnTimeZone);
            }
            else if (startTime.Kind == DateTimeKind.Unspecified)
            {
                // Assume it's UTC if unspecified (common when deserializing from JSON)
                startTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(startTime, DateTimeKind.Utc), vnTimeZone);
            }
            
            var endTime = request.EndTime;
            if (endTime.Kind == DateTimeKind.Utc)
            {
                endTime = TimeZoneInfo.ConvertTimeFromUtc(endTime, vnTimeZone);
            }
            else if (endTime.Kind == DateTimeKind.Unspecified)
            {
                endTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(endTime, DateTimeKind.Utc), vnTimeZone);
            }

            // Lấy giờ VN chính xác
            var now = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "SE Asia Standard Time");

            if (startTime < now)
                throw new Exception("Không thể đặt lịch trong quá khứ.");

            if (endTime <= startTime)
                throw new Exception("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");

            // Ràng buộc giờ hoạt động
            var minTime = new TimeSpan(4, 0, 0);      // 04:00
            var maxTime = new TimeSpan(23, 59, 0);    // 23:59

            if (startTime.TimeOfDay < minTime || endTime.TimeOfDay > maxTime)
                throw new Exception("Chỉ được đặt xe trong khoảng 04:00 – 23:59");

            // === 2. LẤY DỮ LIỆU LIÊN QUAN ===
            var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId);
            var coOwner = await _coOwnerRepository.GetByIdAsync(request.CoOwnerId);
            var allBookings = await _bookingRepository.GetAllAsync();

            if (vehicle == null)
                throw new Exception($"Xe với ID {request.VehicleId} không tồn tại.");

            // Tự động tạo CoOwner nếu chưa tồn tại (sync với auth-service)
            if (coOwner == null)
            {
                _logger?.LogWarning("CoOwner với ID {CoOwnerId} không tồn tại, đang tạo mới...", request.CoOwnerId);
                
                // Kiểm tra xem có CoOwner nào với name pattern tương ứng không (tránh duplicate)
                var existingCoOwners = await _coOwnerRepository.GetAllAsync();
                var coOwnerName = $"CoOwner {request.CoOwnerId}";
                coOwner = existingCoOwners.FirstOrDefault(c => c.Name == coOwnerName);
                
                if (coOwner == null)
                {
                    // Tạo CoOwner mới (không set ID, để database tự generate)
                    coOwner = new BookingService.Models.CoOwner
                    {
                        // Không set Id - để database tự generate
                        Name = coOwnerName,
                        OwnershipRatio = 50m, // Default 50%, có thể cập nhật sau
                        UsageCount = 0
                    };
                    await _coOwnerRepository.AddAsync(coOwner);
                    await _coOwnerRepository.SaveChangesAsync();
                    _logger?.LogInformation("Đã tạo CoOwner mới với ID {CoOwnerId} (mapped from user ID {UserId})", 
                        coOwner.Id, request.CoOwnerId);
                }
                else
                {
                    _logger?.LogInformation("Tìm thấy CoOwner existing với name {Name}, ID {CoOwnerId}", 
                        coOwner.Name, coOwner.Id);
                }
                
                // Cập nhật CoOwnerId trong request để dùng ID từ database
                request.CoOwnerId = coOwner.Id;
            }

            // === 3. KIỂM TRA TRÙNG LỊCH ===
            var overlappingBookings = allBookings
                .Where(b =>
                    b.VehicleId == request.VehicleId &&
                    b.Status != "Cancelled" &&
                    b.EndTime > startTime &&
                    b.StartTime < endTime
                )
                .ToList();

            var hoursBeforeStart = (startTime - now).TotalHours;

            // === 4. TRƯỜNG HỢP: ĐẶT TRONG 4 GIỜ TRƯỚC KHI BẮT ĐẦU ===
            if (hoursBeforeStart <= 4)
            {
                if (overlappingBookings.Any())
                    throw new Exception("Không thể đặt — trong 4 giờ chỉ đặt khi xe trống.");
            }
            else
            {
                // === 5. ĐẶT TRƯỚC 4 GIỜ – ÁP DỤNG RULE ƯU TIÊN ===
                if (overlappingBookings.Any())
                {
                    var startOfMonth = new DateTime(startTime.Year, startTime.Month, 1);

                    // Tính usage của người đang đặt
                    var userUsedHours = allBookings
                        .Where(b =>
                            b.CoOwnerId == request.CoOwnerId &&
                            b.VehicleId == request.VehicleId &&
                            b.StartTime >= startOfMonth &&
                            b.StartTime < startTime &&
                            b.Status != "Cancelled"
                        )
                        .Sum(b => (b.EndTime - b.StartTime).TotalHours);

                    double allowedHoursPerMonth = 20 * ((double)coOwner.OwnershipRatio / 100.0);
                    double userUsageRatio = userUsedHours / allowedHoursPerMonth;

                    bool hasHigherPriority = true;

                    foreach (var existing in overlappingBookings)
                    {
                        var other = existing.CoOwner;
                        if (other == null) continue;

                        var otherUsedHours = allBookings
                            .Where(b =>
                                b.CoOwnerId == other.Id &&
                                b.VehicleId == request.VehicleId &&
                                b.StartTime >= startOfMonth &&
                                b.StartTime < startTime &&
                                b.Status != "Cancelled"
                            )
                            .Sum(b => (b.EndTime - b.StartTime).TotalHours);

                        double otherAllowed = 20 * ((double)other.OwnershipRatio / 100.0);
                        double otherUsageRatio = otherUsedHours / otherAllowed;

                        // Nếu user dùng nhiều hơn người kia => user *không* có ưu tiên
                        if (userUsageRatio >= otherUsageRatio)
                        {
                            hasHigherPriority = false;
                            break;
                        }
                    }

                    if (!hasHigherPriority)
                    {
                        throw new Exception("Không thể đặt — người khác có độ ưu tiên cao hơn.");
                    }

                    // === 6. User có ưu tiên => cancel booking người khác ===
                    // Nếu user có ưu tiên cao hơn, hủy các booking trùng lịch của người khác
                    foreach (var existing in overlappingBookings)
                    {
                        existing.Status = "Cancelled";
                    }

                    await _bookingRepository.SaveChangesAsync();
                }
            }

            // === 6.5. GỌI AI SERVICE ĐỂ KIỂM TRA FAIRNESS (OPTIONAL) ===
            // Gọi AI service để đánh giá tính công bằng của booking và đề xuất alternative slots
            if (_aiService != null)
            {
                try
                {
                    // Lấy usage history từ database
                    var usageHistory = allBookings
                        .Where(b => b.CoOwnerId == request.CoOwnerId && 
                                   b.VehicleId == request.VehicleId &&
                                   b.Status != "Cancelled" &&
                                   b.StartTime >= DateTime.UtcNow.AddDays(-30))
                        .Select(b => new Dictionary<string, object>
                        {
                            { "start_time", b.StartTime },
                            { "end_time", b.EndTime },
                            { "hours", (b.EndTime - b.StartTime).TotalHours }
                        })
                        .ToList<Dictionary<string, object>>();

                    var aiRequest = new BookingSuggestionRequest
                    {
                        VehicleGroupId = request.VehicleId.ToString(), // Using VehicleId as group identifier
                        RequestedStart = startTime,
                        RequestedEnd = endTime,
                        CoOwnerId = request.CoOwnerId.ToString(),
                        OwnershipPercentage = (double)coOwner.OwnershipRatio / 100.0,
                        UsageHistory = usageHistory
                    };

                    var aiSuggestion = await _aiService.GetBookingSuggestionAsync(aiRequest);
                    if (aiSuggestion != null)
                    {
                        _logger?.LogInformation("AI suggestion: FairnessScore={Score}, Reason={Reason}", 
                            aiSuggestion.FairnessScore, aiSuggestion.Reason);
                        
                        // Nếu fairness score quá thấp và có alternative slots, có thể cảnh báo
                        if (aiSuggestion.FairnessScore < 0.3 && aiSuggestion.AlternativeSlots != null && aiSuggestion.AlternativeSlots.Any())
                        {
                            _logger?.LogWarning("Low fairness score ({Score}) for booking. Consider alternative slots.", 
                                aiSuggestion.FairnessScore);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to get AI suggestion for booking. Continuing without AI input.");
                }
            }

            // === 7. TẠO BOOKING ===
            // Tạo booking entity và lưu vào database
            var newBooking = new Booking
            {
                VehicleId = request.VehicleId,
                CoOwnerId = request.CoOwnerId,
                StartTime = startTime,
                EndTime = endTime,
                Status = (hoursBeforeStart <= 4) ? "Confirmed" : "Pending",
                Note = request.Note
            };

            await _bookingRepository.AddAsync(newBooking);
            await _bookingRepository.SaveChangesAsync();

            var saved = await _bookingRepository.GetByIdAsync(newBooking.Id);
            if (saved == null)
                throw new Exception("Không thể lấy booking sau khi lưu.");

            // Publish BookingCreated event qua RabbitMQ để các service khác biết
            if (_rabbitMQService != null)
            {
                try
                {
                    _rabbitMQService.PublishEvent("booking.created", new BookingCreatedEvent
                    {
                        BookingId = saved.Id,
                        CoOwnerId = saved.CoOwnerId,
                        VehicleId = saved.VehicleId,
                        StartTime = saved.StartTime,
                        EndTime = saved.EndTime,
                        Status = saved.Status ?? "Pending"
                    });
                    _logger?.LogInformation("Published BookingCreated event for booking {BookingId}", saved.Id);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to publish BookingCreated event for booking {BookingId}", saved.Id);
                }
            }

            // === 8. TRẢ RESPONSE ===
            // Trả về thông tin booking vừa tạo
            return new BookingResponse
            {
                Id = saved.Id,
                VehicleId = saved.VehicleId,
                VehicleName = vehicle.Name,
                CoOwnerId = saved.CoOwnerId,
                CoOwnerName = coOwner.Name,
                StartTime = saved.StartTime,
                EndTime = saved.EndTime,
                Status = saved.Status,
                Note = saved.Note
            };
        }


        /// <summary>
        /// Cập nhật thông tin booking (thời gian, ghi chú, etc.)
        /// Chỉ có thể cập nhật booking có trạng thái "Pending"
        /// </summary>
        /// <param name="bookingId">ID của booking cần cập nhật</param>
        /// <param name="request">Thông tin mới của booking</param>
        /// <returns>Thông tin booking sau khi cập nhật, null nếu không tìm thấy</returns>
        public async Task<BookingResponse?> UpdateBookingAsync(int bookingId, UpdateBookingRequest request)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null) return null;
            if (booking.Status != "Pending")
                throw new Exception("Chỉ có thể cập nhật booking đang Pending .");

            // Convert request times to VN timezone if they are in UTC
            // Frontend sends UTC time, but we need to compare with VN time
            var vnTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            
            // If StartTime is UTC (Kind == Utc), convert to VN time
            // Otherwise, assume it's already in local/VN time
            var startTime = request.StartTime;
            if (startTime.Kind == DateTimeKind.Utc)
            {
                startTime = TimeZoneInfo.ConvertTimeFromUtc(startTime, vnTimeZone);
            }
            else if (startTime.Kind == DateTimeKind.Unspecified)
            {
                // Assume it's UTC if unspecified (common when deserializing from JSON)
                startTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(startTime, DateTimeKind.Utc), vnTimeZone);
            }
            
            var endTime = request.EndTime;
            if (endTime.Kind == DateTimeKind.Utc)
            {
                endTime = TimeZoneInfo.ConvertTimeFromUtc(endTime, vnTimeZone);
            }
            else if (endTime.Kind == DateTimeKind.Unspecified)
            {
                endTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(endTime, DateTimeKind.Utc), vnTimeZone);
            }

            // Lấy giờ VN hiện tại  
            var now = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "SE Asia Standard Time");

            // === 1. VALIDATION CƠ BẢN ===  
            if (startTime < now)
                throw new Exception("Không thể đặt lịch trong quá khứ.");

            if (endTime <= startTime)
                throw new Exception("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");

            var minTime = new TimeSpan(4, 0, 0);      // 04:00  
            var maxTime = new TimeSpan(23, 59, 0);    // 23:59  

            if (startTime.TimeOfDay < minTime || endTime.TimeOfDay > maxTime)
                throw new Exception("Chỉ được đặt xe trong khoảng 04:00 – 23:59");
                throw new Exception("Chỉ được đặt xe trong khoảng 04:00 – 23:59");

            // === 2. LẤY DỮ LIỆU LIÊN QUAN ===  
            var vehicle = await _vehicleRepository.GetByIdAsync(booking.VehicleId);
            var coOwner = await _coOwnerRepository.GetByIdAsync(booking.CoOwnerId);
            var allBookings = await _bookingRepository.GetAllAsync();

            if (vehicle == null || coOwner == null)
                throw new Exception("Xe hoặc người đồng sở hữu không tồn tại.");

            // === 3. KIỂM TRA TRÙNG LỊCH ===  
            var overlappingBookings = allBookings
                .Where(b =>
                    b.VehicleId == booking.VehicleId &&
                    b.Id != bookingId && // không tính chính booking này  
                    b.Status != "Cancelled" &&
                    b.EndTime > startTime &&
                    b.StartTime < endTime
                )
                .ToList();

            var hoursBeforeStart = (startTime - now).TotalHours;

            // === 4. TRƯỜNG HỢP: ĐẶT TRONG 4 GIỜ TRƯỚC KHI BẮT ĐẦU ===  
            if (hoursBeforeStart <= 4)
            {
                if (overlappingBookings.Any())
                    throw new Exception("Không thể đặt — trong 4 giờ chỉ đặt khi xe trống.");
            }
            else
            {
                // === 5. ĐẶT TRƯỚC 4 GIỜ – ÁP DỤNG RULE ƯU TIÊN ===  
                if (overlappingBookings.Any())
                {
                    var startOfMonth = new DateTime(startTime.Year, startTime.Month, 1);

                    var userUsedHours = allBookings
                        .Where(b => b.CoOwnerId == booking.CoOwnerId &&
                                    b.VehicleId == booking.VehicleId &&
                                    b.StartTime >= startOfMonth &&
                                    b.StartTime < startTime &&
                                    b.Status != "Cancelled" &&
                                    b.Id != bookingId) // exclude chính booking này  
                        .Sum(b => (b.EndTime - b.StartTime).TotalHours);

                    double allowedHoursPerMonth = 20 * ((double)coOwner.OwnershipRatio / 100.0);
                    double userUsageRatio = userUsedHours / allowedHoursPerMonth;

                    bool hasHigherPriority = true;

                    foreach (var existing in overlappingBookings)
                    {
                        var other = existing.CoOwner;
                        if (other == null) continue;

                        var otherUsedHours = allBookings
                            .Where(b => b.CoOwnerId == other.Id &&
                                        b.VehicleId == booking.VehicleId &&
                                        b.StartTime >= startOfMonth &&
                                        b.StartTime < startTime &&
                                        b.Status != "Cancelled")
                            .Sum(b => (b.EndTime - b.StartTime).TotalHours);

                        double otherAllowed = 20 * ((double)other.OwnershipRatio / 100.0);
                        double otherUsageRatio = otherUsedHours / otherAllowed;

                        if (userUsageRatio >= otherUsageRatio)
                        {
                            hasHigherPriority = false;
                            break;
                        }
                    }

                    if (!hasHigherPriority)
                    {
                        throw new Exception("Không thể cập nhật — người khác có độ ưu tiên cao hơn.");
                    }

                    // User có ưu tiên => cancel booking người khác  
                    foreach (var existing in overlappingBookings)
                    {
                        existing.Status = "Cancelled";
                    }

                    await _bookingRepository.SaveChangesAsync();
                }
            }

            // === 6. CẬP NHẬT BOOKING ===  
            // Convert VN time back to UTC for database storage
            var startTimeUtc = TimeZoneInfo.ConvertTimeToUtc(startTime, vnTimeZone);
            var endTimeUtc = TimeZoneInfo.ConvertTimeToUtc(endTime, vnTimeZone);
            
            booking.StartTime = startTimeUtc;
            booking.EndTime = endTimeUtc;
            booking.Note = request.Note;
            booking.Status = (hoursBeforeStart <= 4) ? "Confirmed" : "Pending";

            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            // Reload booking to get updated data
            var updatedBooking = await _bookingRepository.GetByIdAsync(bookingId);
            if (updatedBooking == null)
                throw new Exception("Không thể lấy booking sau khi cập nhật.");

            return new BookingResponse
            {
                Id = updatedBooking.Id,
                VehicleId = updatedBooking.VehicleId,
                VehicleName = vehicle.Name,
                CoOwnerId = updatedBooking.CoOwnerId,
                CoOwnerName = coOwner.Name,
                StartTime = updatedBooking.StartTime,
                EndTime = updatedBooking.EndTime,
                Status = updatedBooking.Status,
                Note = updatedBooking.Note
            };

        }


        /// <summary>
        /// Cập nhật trạng thái của booking
        /// Nếu trạng thái chuyển sang "Approved" hoặc "Confirmed", sẽ publish event qua RabbitMQ
        /// </summary>
        /// <param name="bookingId">ID của booking</param>
        /// <param name="status">Trạng thái mới (Pending, Confirmed, Approved, InProgress, Completed, Cancelled, NoShow)</param>
        /// <returns>Thông tin booking sau khi cập nhật, null nếu không tìm thấy</returns>
        public async Task<BookingResponse?> UpdateBookingStatusAsync(int bookingId, string status)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null) return null;


            // Validate status values
            var validStatuses = new[] { "Pending", "Confirmed", "Approved", "Đã đặt", "InProgress", "Completed", "Cancelled", "NoShow" };
            if (!validStatuses.Contains(status))
                throw new ArgumentException($"Invalid status: {status}. Valid statuses are: {string.Join(", ", validStatuses)}");

            var oldStatus = booking.Status;
            booking.Status = status;
            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            // Publish BookingApproved event if status changed to Approved or Confirmed
            if (_rabbitMQService != null && (status == "Approved" || status == "Confirmed") && oldStatus != status)
            {
                try
                {
                    _rabbitMQService.PublishEvent("booking.approved", new BookingApprovedEvent
                    {
                        BookingId = booking.Id,
                        CoOwnerId = booking.CoOwnerId,
                        VehicleId = booking.VehicleId,
                        StartTime = booking.StartTime,
                        EndTime = booking.EndTime,
                        Status = status,
                        ApprovedAt = DateTime.UtcNow
                    });
                    _logger?.LogInformation("Published BookingApproved event for booking {BookingId}", booking.Id);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to publish BookingApproved event for booking {BookingId}", booking.Id);
                }
            }

            return new BookingResponse
            {
                Id = booking.Id,
                VehicleId = booking.VehicleId,
                VehicleName = booking.Vehicle?.Name,
                CoOwnerId = booking.CoOwnerId,
                CoOwnerName = booking.CoOwner?.Name,
                StartTime = TimeZoneHelper.ToVietnamTime(booking.StartTime),
                EndTime = TimeZoneHelper.ToVietnamTime(booking.EndTime),
                Status = booking.Status,
                Note = booking.Note
            };
        }



        /// <summary>
        /// Hủy booking (chuyển trạng thái sang "Cancelled")
        /// </summary>
        /// <param name="bookingId">ID của booking cần hủy</param>
        /// <returns>True nếu hủy thành công, False nếu không tìm thấy booking</returns>
        public async Task<bool> CancelBookingAsync(int bookingId)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null) return false;

            booking.Status = "Cancelled";
            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();
            return true;
        }
        /// <summary>
        /// Xóa booking khỏi database (hard delete)
        /// </summary>
        /// <param name="bookingId">ID của booking cần xóa</param>
        public async Task DeleteBookingAsync(int bookingId)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null)
                throw new Exception("Booking không tồn tại.");

            await _bookingRepository.RemoveAsync(booking);
            await _bookingRepository.SaveChangesAsync();
        }

        /// <summary>
        /// Tạo QR code cho booking
        /// QR code được sử dụng để check-in khi nhận xe
        /// Chỉ có thể tạo QR code cho booking có trạng thái "Confirmed"
        /// </summary>
        /// <param name="bookingId">ID của booking</param>
        /// <returns>QR code dưới dạng string và base64 image</returns>
        public async Task<QrCodeResponse> GenerateQrCodeAsync(int bookingId)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null)
                throw new Exception("Booking không tồn tại.");

            if (booking.Status != "Confirmed")
                throw new Exception("Chỉ có thể tạo QR code cho booking đã xác nhận.");

            var qrCodeData = _qrCodeService.GenerateQrCode(bookingId);
            var qrCodeImageBase64 = _qrCodeService.GenerateQrCodeImageBase64(qrCodeData);

            booking.QrCode = qrCodeData;
            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            return new QrCodeResponse
            {
                BookingId = bookingId,
                QrCode = qrCodeData,
                QrCodeImageUrl = $"data:image/png;base64,{qrCodeImageBase64}",
                ExpiresAt = TimeZoneHelper.ToVietnamTime(DateTime.UtcNow.AddHours(24))
            };
        }


        /// <summary>
        /// Check-in cho booking (nhận xe)
        /// Yêu cầu:
        /// - Booking phải có trạng thái "Confirmed"
        /// - QR code phải hợp lệ (nếu có)
        /// - Chỉ có thể check-in trước tối đa 5 phút và sau giờ bắt đầu
        /// Sau khi check-in thành công, trạng thái sẽ chuyển sang "InProgress"
        /// </summary>
        /// <param name="bookingId">ID của booking</param>
        /// <param name="request">Request chứa QR code và digital signature</param>
        /// <returns>Thông tin check-in thành công</returns>
        public async Task<CheckInResponse> CheckInAsync(int bookingId, CheckInRequest request)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null)
                throw new Exception("Booking không tồn tại.");

            if (!string.IsNullOrEmpty(request.QrCode) &&
                !_qrCodeService.ValidateQrCode(request.QrCode, bookingId))
            {
                throw new Exception("QR code không hợp lệ hoặc đã hết hạn.");
            }

            if (booking.CheckInTime.HasValue)
                throw new Exception("Booking đã được check-in rồi.");

            if (booking.Status != "Confirmed")
                throw new Exception("Chỉ có thể check-in cho booking đã xác nhận.");

            var now = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "SE Asia Standard Time");

            // Chỉ cho check-in trước 5 phút và sau giờ bắt đầu
            if (now < booking.StartTime.AddMinutes(-5))
                throw new Exception("Chưa đến giờ check-in. Chỉ có thể check-in trước tối đa 5 phút.");

            if (now > booking.EndTime)
                throw new Exception("Quá thời gian check-in.");

            booking.CheckInTime = now;
            booking.Status = "InProgress";
            if (!string.IsNullOrEmpty(request.DigitalSignature))
                booking.DigitalSignature = request.DigitalSignature;

            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            _rabbitMQService.PublishEvent("booking.checked-in", new
            {
                BookingId = bookingId,
                VehicleId = booking.VehicleId,
                CoOwnerId = booking.CoOwnerId,
                CheckInTime = now
            });

            return new CheckInResponse
            {
                BookingId = bookingId,
                CheckInTime = TimeZoneHelper.ToVietnamTime(now),
                Message = "Check-in thành công"
            };
        }

        /// <summary>
        /// Check-out cho booking (trả xe)
        /// Yêu cầu:
        /// - Booking phải đã được check-in
        /// - Chỉ có thể check-out trong khoảng từ giờ bắt đầu đến 5 phút sau giờ kết thúc
        /// Sau khi check-out thành công:
        /// - Trạng thái sẽ chuyển sang "Completed"
        /// - Tạo bản ghi trong BookingHistory
        /// - Publish event "booking.completed" qua RabbitMQ
        /// </summary>
        /// <param name="bookingId">ID của booking</param>
        /// <param name="request">Request chứa distance (km) và cost (chi phí)</param>
        /// <returns>Thông tin check-out thành công</returns>
        public async Task<CheckOutResponse> CheckOutAsync(int bookingId, CheckOutRequest request)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null)
                throw new Exception("Booking không tồn tại.");

            if (!booking.CheckInTime.HasValue)
                throw new Exception("Chưa check-in, không thể check-out.");

            if (booking.CheckOutTime.HasValue)
                throw new Exception("Booking đã được check-out rồi.");

            var now = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "SE Asia Standard Time");

            // Chỉ cho check-out trong khoảng kết thúc đến +5 phút
            if (now < booking.StartTime)
                throw new Exception("Chưa đến giờ kết thúc, không thể check-out.");
            if (now > booking.EndTime.AddMinutes(5))
                throw new Exception("Quá thời gian check-out.");

            booking.CheckOutTime = now;
            booking.DistanceKm = request.DistanceKm;
            booking.Cost = request.Cost;
            if (!string.IsNullOrEmpty(request.Note))
                booking.Note = request.Note;

            booking.Status = "Completed";

            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            var history = new BookingHistory
            {
                BookingId = booking.Id,
                VehicleId = booking.VehicleId,
                CoOwnerId = booking.CoOwnerId,
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                CheckInTime = booking.CheckInTime.Value,
                CheckOutTime = now,
                DistanceKm = request.DistanceKm,
                Cost = request.Cost,
                Note = booking.Note
            };

            await _bookingHistoryRepository.AddAsync(history);
            await _bookingHistoryRepository.SaveChangesAsync();

            _rabbitMQService.PublishEvent("booking.completed", new BookingCompletedEvent
            {
                BookingId = bookingId,
                VehicleId = booking.VehicleId,
                CoOwnerId = booking.CoOwnerId,
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                Distance = (double)request.DistanceKm,
                Cost = (double)(request.Cost ?? 0),
                CheckInTime = booking.CheckInTime.Value,
                CheckOutTime = now,
                CompletedAt = now
            });

            return new CheckOutResponse
            {
                BookingId = bookingId,
                CheckOutTime = TimeZoneHelper.ToVietnamTime(now),
                DistanceKm = request.DistanceKm,
                Cost = request.Cost,
                Message = "Check-out thành công"
            };
        }


        /// <summary>
        /// Kiểm tra và cập nhật các booking có trạng thái NoShow (không đến nhận xe)
        /// Một booking được coi là NoShow nếu:
        /// - Trạng thái là "Confirmed"
        /// - Chưa được check-in
        /// - Đã quá 5 phút kể từ giờ bắt đầu
        /// Method này thường được gọi tự động bởi background service
        /// </summary>
        public async Task CheckAndUpdateNoShowBookingsAsync()
        {
            var now = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "SE Asia Standard Time");
            var allBookings = await _bookingRepository.GetAllAsync();

            // Tìm các booking thỏa mãn điều kiện NoShow
            var noShowBookings = allBookings
                .Where(b => b.Status == "confirmed" &&
                        !b.CheckInTime.HasValue &&
                        b.StartTime < now &&
                        (now - b.StartTime).TotalMinutes >= 5)
                .ToList();

            // Cập nhật trạng thái sang "NoShow"
            foreach (var booking in noShowBookings)
            {
                booking.Status = "NoShow";
                _logger?.LogInformation("Booking {BookingId} automatically marked as NoShow", booking.Id);
            }

            // Lưu thay đổi nếu có
            if (noShowBookings.Any())
                await _bookingRepository.SaveChangesAsync();

        }



        /// <summary>
        /// Lấy lịch sử booking của một co-owner
        /// Chỉ trả về các booking đã hoàn thành (có trong BookingHistory)
        /// </summary>
        /// <param name="coOwnerId">ID của co-owner</param>
        /// <returns>Danh sách lịch sử booking</returns>
        public async Task<IEnumerable<BookingHistoryResponse>> GetBookingHistoryAsync(int coOwnerId)
        {
            var histories = await _bookingHistoryRepository.GetByCoOwnerIdAsync(coOwnerId);

            return histories.Select(h => new BookingHistoryResponse
            {
                BookingId = h.BookingId,
                VehicleId = h.VehicleId,
                StartTime = TimeZoneHelper.ToVietnamTime(h.StartTime),
                EndTime = TimeZoneHelper.ToVietnamTime(h.EndTime),
                CheckInTime = TimeZoneHelper.ToVietnamTime(h.CheckInTime),
                CheckOutTime = TimeZoneHelper.ToVietnamTime(h.CheckOutTime),
                DistanceKm = h.DistanceKm,
                Cost = h.Cost,
                Note = h.Note
            });
        }

    }
}

