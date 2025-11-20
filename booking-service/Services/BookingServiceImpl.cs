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
    public class BookingServiceImpl : IBookingService
    {
        private readonly IBookingRepository _bookingRepository;
        private readonly IBookingHistoryRepository _bookingHistoryRepository;

        private readonly IVehicleRepository _vehicleRepository;
        private readonly ICoOwnerRepository _coOwnerRepository;
        private readonly IQrCodeService _qrCodeService;
        private readonly IRabbitMQService _rabbitMQService;
        private readonly IAiService? _aiService;
        private readonly ILogger<BookingServiceImpl>? _logger;

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
                // và status là Confirmed, InProgress, hoặc Đã đặt
                var isCurrentlyInUse = vehicleBookings.Any(b =>
                    b.StartTime <= now &&
                    b.EndTime >= now &&
                    (b.Status == "Confirmed" || b.Status == "Đã đặt" || b.Status == "InProgress"));

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

        // Lấy tất cả booking
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

        // Tạo booking mới
        public async Task<BookingResponse?> CreateBookingAsync(CreateBookingRequest request)
        {
            // === 1. VALIDATION CƠ BẢN ===
            var startTime = request.StartTime;
            var endTime = request.EndTime;

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

            if (vehicle == null || coOwner == null)
                throw new Exception("Xe hoặc người đồng sở hữu không tồn tại.");

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
                    foreach (var existing in overlappingBookings)
                    {
                        existing.Status = "Cancelled";
                    }

                    await _bookingRepository.SaveChangesAsync();
                }
            }

            // === 7. TẠO BOOKING ===
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

            // === 8. TRẢ RESPONSE ===
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


        // Cập nhật booking
        public async Task<BookingResponse?> UpdateBookingAsync(int bookingId, UpdateBookingRequest request)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null) return null;
            if (booking.Status != "Pending")
                throw new Exception("Chỉ có thể cập nhật booking đang Pending .");

            // Normalize thời gian về UTC nếu cần  
            var startTime = request.StartTime.Kind == DateTimeKind.Unspecified
                ? TimeZoneHelper.FromVietnamTime(request.StartTime)
                : request.StartTime.ToUniversalTime();
            var endTime = request.EndTime.Kind == DateTimeKind.Unspecified
                ? TimeZoneHelper.FromVietnamTime(request.EndTime)
                : request.EndTime.ToUniversalTime();

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
            booking.StartTime = startTime;
            booking.EndTime = endTime;
            booking.Note = request.Note;
            booking.Status = (hoursBeforeStart <= 4) ? "Confirmed" : "Pending";

            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            return new BookingResponse
            {
                Id = booking.Id,
                VehicleId = booking.VehicleId,
                VehicleName = vehicle.Name,
                CoOwnerId = booking.CoOwnerId,
                CoOwnerName = coOwner.Name,
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                Status = (hoursBeforeStart <= 4) ? "Confirmed" : "Pending",
                Note = booking.Note
            };

        }


        // Cập nhật trạng thái booking
        public async Task<BookingResponse?> UpdateBookingStatusAsync(int bookingId, string status)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null) return null;


            // Validate status values
            var validStatuses = new[] { "Pending", "Confirmed", "Đã đặt", "InProgress", "Completed", "Cancelled", "NoShow" };
            if (!validStatuses.Contains(status))
                throw new ArgumentException($"Invalid status: {status}. Valid statuses are: {string.Join(", ", validStatuses)}");

            booking.Status = status;
            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

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



        // Hủy booking
        public async Task<bool> CancelBookingAsync(int bookingId)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null) return false;

            booking.Status = "Cancelled";
            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();
            return true;
        }
        public async Task DeleteBookingAsync(int bookingId)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null)
                throw new Exception("Booking không tồn tại.");

            await _bookingRepository.RemoveAsync(booking);
            await _bookingRepository.SaveChangesAsync();
        }

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


        public async Task CheckAndUpdateNoShowBookingsAsync()
        {
            var now = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "SE Asia Standard Time");
            var allBookings = await _bookingRepository.GetAllAsync();

            var noShowBookings = allBookings
                .Where(b => b.Status == "confirmed" &&
                        !b.CheckInTime.HasValue &&
                        b.StartTime < now &&
                        (now - b.StartTime).TotalMinutes >= 5)
                .ToList();

            foreach (var booking in noShowBookings)
            {
                booking.Status = "NoShow";
                _logger?.LogInformation("Booking {BookingId} automatically marked as NoShow", booking.Id);
            }

            if (noShowBookings.Any())
                await _bookingRepository.SaveChangesAsync();

        }



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

