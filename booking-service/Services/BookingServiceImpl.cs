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
            IAiService? aiService = null,
            ILogger<BookingServiceImpl>? logger = null)
        {
            _bookingRepository = bookingRepository;
            _vehicleRepository = vehicleRepository;
            _coOwnerRepository = coOwnerRepository;
            _qrCodeService = qrCodeService;
            _rabbitMQService = rabbitMQService;
            _aiService = aiService;
            _logger = logger;
        }


        public async Task<IEnumerable<VehicleScheduleResponse>> GetVehicleSchedulesAsync()
        {
            var vehicles = await _vehicleRepository.GetAllAsync();
            var bookings = await _bookingRepository.GetAllAsync();

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


                return new VehicleScheduleResponse
                {
                    VehicleId = v.Id,
                    VehicleName = v.Name,
                    IsActive = v.IsActive,
                    Bookings = vehicleBookings,
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
            var now = DateTime.Now;
            var hoursBeforeStart = (request.StartTime - now).TotalHours;

            // Lấy xe và chủ sở hữu
            var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId);
            var coOwner = await _coOwnerRepository.GetByIdAsync(request.CoOwnerId);
            var allBookings = await _bookingRepository.GetAllAsync();

            if (vehicle == null || coOwner == null)
                throw new Exception("Xe hoặc người đồng sở hữu không tồn tại.");

            // Lấy các booking bị trùng giờ
            var overlappingBookings = allBookings
                .Where(b => b.VehicleId == request.VehicleId &&
                            b.Status != "Cancelled" &&
                            b.EndTime > request.StartTime &&
                            b.StartTime < request.EndTime)
                .ToList();

            // ------------------------
            // TRƯỜNG HỢP 2: Trong 4 giờ trước khi bắt đầu
            // ------------------------
            if (hoursBeforeStart <= 4)
            {
                if (overlappingBookings.Any())
                    throw new Exception("Không thể đặt — trong 4h chỉ đặt khi xe trống.");
            }
            else
            {
                // ------------------------
                // TRƯỜNG HỢP 1: Đặt trước 4 giờ
                // ------------------------
                if (overlappingBookings.Any())
                {
                var startOfMonth = new DateTime(request.StartTime.Year, request.StartTime.Month, 1);

                // Tính tổng số giờ người đặt đã sử dụng trong tháng
                var userUsedHours = allBookings
                    .Where(b => b.CoOwnerId == request.CoOwnerId &&
                                b.VehicleId == request.VehicleId &&
                                b.StartTime >= startOfMonth &&
                                b.StartTime < request.StartTime &&
                                b.Status != "Cancelled")
                    .Sum(b => (b.EndTime - b.StartTime).TotalHours);

                // Giờ sử dụng tối đa/ngày theo tỉ lệ sở hữu
                double allowedHoursPerDay = 20 * ((double)coOwner.OwnershipRatio / 100.0);
                double userUsageRatio = userUsedHours / allowedHoursPerDay;

                // Try to get AI suggestion for fair booking
                BookingSuggestionResponse? aiSuggestion = null;
                if (_aiService != null)
                {
                    try
                    {
                        var usageHistory = allBookings
                            .Where(b => b.VehicleId == request.VehicleId &&
                                        b.StartTime >= startOfMonth &&
                                        b.Status != "Cancelled")
                            .Select(b => new Dictionary<string, object>
                            {
                                { "co_owner_id", b.CoOwnerId.ToString() },
                                { "hours", (b.EndTime - b.StartTime).TotalHours },
                                { "start_time", b.StartTime },
                                { "end_time", b.EndTime }
                            })
                            .ToList<Dictionary<string, object>>();

                        var aiRequest = new BookingSuggestionRequest
                        {
                            VehicleGroupId = request.VehicleId.ToString(),
                            RequestedStart = request.StartTime,
                            RequestedEnd = request.EndTime,
                            CoOwnerId = request.CoOwnerId.ToString(),
                            OwnershipPercentage = (double)coOwner.OwnershipRatio / 100.0,
                            UsageHistory = usageHistory
                        };

                        aiSuggestion = await _aiService.GetBookingSuggestionAsync(aiRequest);
                        
                        if (aiSuggestion != null && aiSuggestion.FairnessScore < 0.3)
                        {
                            _logger?.LogWarning("AI suggests low fairness score {Score} for booking. Reason: {Reason}", 
                                aiSuggestion.FairnessScore, aiSuggestion.Reason);
                            // Could throw exception or suggest alternative slots
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "Failed to get AI suggestion, proceeding with default logic");
                    }
                }

                bool hasHigherPriority = true;

                // So sánh với từng người đang giữ lịch
                foreach (var existing in overlappingBookings)
                {
                    var other = existing.CoOwner;
                    if (other == null) continue;

                    var otherUsedHours = allBookings
                        .Where(b => b.CoOwnerId == other.Id &&
                                    b.VehicleId == request.VehicleId &&
                                    b.StartTime >= startOfMonth &&
                                    b.StartTime < request.StartTime &&
                                    b.Status != "Cancelled")
                        .Sum(b => (b.EndTime - b.StartTime).TotalHours);

                    double otherAllowedPerDay = 20 * ((double)other.OwnershipRatio / 100.0);
                    double otherUsageRatio = otherUsedHours / otherAllowedPerDay;

                    // Người đặt chỉ thắng nếu tỉ lệ sử dụng < người đang giữ
                    if (userUsageRatio >= otherUsageRatio)
                    {
                        hasHigherPriority = false;
                        break;
                    }
                }

                if (!hasHigherPriority)
                {
                    var message = "Không thể đặt — người khác có độ ưu tiên cao hơn.";
                    if (aiSuggestion != null && aiSuggestion.AlternativeSlots != null && aiSuggestion.AlternativeSlots.Any())
                    {
                        message += $" AI đề xuất các khung giờ thay thế.";
                    }
                    throw new Exception(message);
                }
                else
                {
                    // Hủy các booking bị thua ưu tiên
                    foreach (var existing in overlappingBookings)
                    {
                        existing.Status = "Cancelled";
                    }
                    await _bookingRepository.SaveChangesAsync();
                }
            }
            }

            // ------------------------
            // Tạo booking mới
            // ------------------------
            var newBooking = new Booking
            {
                VehicleId = request.VehicleId,
                CoOwnerId = request.CoOwnerId,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Status = "Pending",
                Note = request.Note
            };

            await _bookingRepository.AddAsync(newBooking);
            await _bookingRepository.SaveChangesAsync();

            return new BookingResponse
            {
                Id = newBooking.Id,
                VehicleId = newBooking.VehicleId,
                VehicleName = vehicle.Name,
                CoOwnerId = newBooking.CoOwnerId,
                CoOwnerName = coOwner.Name,
                StartTime = newBooking.StartTime,
                EndTime = newBooking.EndTime,
                Status = newBooking.Status,
                Note = newBooking.Note

            };
        }







        // Cập nhật booking
        public async Task<BookingResponse?> UpdateBookingAsync(int bookingId, UpdateBookingRequest request)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null) return null;

            booking.StartTime = request.StartTime;
            booking.EndTime = request.EndTime;
            booking.Note = request.Note;

            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            return new BookingResponse
            {
                Id = booking.Id,
                VehicleId = booking.VehicleId,
                VehicleName = booking.Vehicle?.Name,
                CoOwnerId = booking.CoOwnerId,
                CoOwnerName = booking.CoOwner?.Name,
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
                Status = booking.Status,
                Note = booking.Note
            };
        }

        // Cập nhật trạng thái booking
        // public async Task<BookingResponse?> UpdateBookingStatusAsync(int bookingId, string status)
        // {
        //     var booking = await _bookingRepository.GetByIdAsync(bookingId);
        //     if (booking == null) return null;

        //     booking.Status = status;
        //     await _bookingRepository.UpdateAsync(booking);
        //     await _bookingRepository.SaveChangesAsync();

        //     return new BookingResponse
        //     {
        //         Id = booking.Id,
        //         VehicleId = booking.VehicleId,
        //         VehicleName = booking.Vehicle?.Name,
        //         CoOwnerId = booking.CoOwnerId,
        //         CoOwnerName = booking.CoOwner?.Name,
        //         StartTime = booking.StartTime,
        //         EndTime = booking.EndTime,
        //         Status = booking.Status,
        //         Note = booking.Note
        //     };
        // }

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

            if (booking.Status != "Đã đặt" && booking.Status != "Confirmed")
                throw new Exception("Chỉ có thể tạo QR code cho booking đã được xác nhận.");

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
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            };
        }

        public async Task<CheckInResponse> CheckInAsync(int bookingId, CheckInRequest request)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null)
                throw new Exception("Booking không tồn tại.");

            // Validate QR code if provided
            if (!string.IsNullOrEmpty(request.QrCode))
            {
                if (!_qrCodeService.ValidateQrCode(request.QrCode, bookingId))
                    throw new Exception("QR code không hợp lệ hoặc đã hết hạn.");
            }

            if (booking.CheckInTime.HasValue)
                throw new Exception("Booking đã được check-in rồi.");

            if (booking.Status != "Đã đặt" && booking.Status != "Confirmed")
                throw new Exception("Chỉ có thể check-in cho booking đã được xác nhận.");

            var checkInTime = DateTime.UtcNow;
            booking.CheckInTime = checkInTime;
            booking.Status = "InProgress";
            if (!string.IsNullOrEmpty(request.DigitalSignature))
            {
                booking.DigitalSignature = request.DigitalSignature;
            }
            // Model Booking không có trường UpdatedAt

            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            // Publish event
            _rabbitMQService.PublishEvent("booking.checked-in", new
            {
                BookingId = bookingId,
                VehicleId = booking.VehicleId,
                CoOwnerId = booking.CoOwnerId,
                CheckInTime = checkInTime
            });

            return new CheckInResponse
            {
                BookingId = bookingId,
                CheckInTime = checkInTime,
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

            var checkOutTime = DateTime.UtcNow;
            booking.CheckOutTime = checkOutTime;
            booking.DistanceKm = request.DistanceKm;
            booking.Cost = request.Cost;
            if (!string.IsNullOrEmpty(request.Note))
            {
                booking.Note = string.IsNullOrEmpty(booking.Note) 
                    ? request.Note 
                    : $"{booking.Note}\n{request.Note}";
            }
            booking.Status = "Completed";

            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();

            // Publish event for payment and report services
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
                CheckOutTime = checkOutTime,
                CompletedAt = checkOutTime
            });

            return new CheckOutResponse
            {
                BookingId = bookingId,
                CheckOutTime = checkOutTime,
                DistanceKm = request.DistanceKm,
                Cost = request.Cost,
                Message = "Check-out thành công"
            };
        }
    }
}

