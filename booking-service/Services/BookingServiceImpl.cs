using BookingService.DTOs;
using BookingService.Models;
using BookingService.Repositories;
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

        public BookingServiceImpl(
            IBookingRepository bookingRepository,
            IVehicleRepository vehicleRepository,
            ICoOwnerRepository coOwnerRepository)
        {
            _bookingRepository = bookingRepository;
            _vehicleRepository = vehicleRepository;
            _coOwnerRepository = coOwnerRepository;
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
                        throw new Exception("Không thể đặt — người khác có độ ưu tiên cao hơn.");
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


    }
}

