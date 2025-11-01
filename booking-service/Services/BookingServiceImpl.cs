
using BookingService.DTOs;
using BookingService.Models;
using BookingService.Repositories;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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

        // Lấy lịch chung xe
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
                        Status = b.Status
                    }).ToList();

                return new VehicleScheduleResponse
                {
                    VehicleId = v.Id,
                    VehicleName = v.Name,
                    IsActive = v.IsActive,
                    Bookings = vehicleBookings
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
            var vehicle = await _vehicleRepository.GetByIdAsync(request.VehicleId);
            var coOwner = await _coOwnerRepository.GetByIdAsync(request.CoOwnerId);

            if (vehicle == null || coOwner == null || !vehicle.IsActive)
                return null;

            // Kiểm tra trùng lịch
            var isOverlapping = (await _bookingRepository.GetAllAsync())
                .Any(b => b.VehicleId == request.VehicleId &&
                         ((request.StartTime >= b.StartTime && request.StartTime < b.EndTime) ||
                          (request.EndTime > b.StartTime && request.EndTime <= b.EndTime)));

            if (isOverlapping) return null;

            // Logic ưu tiên: người ít sử dụng trước → sở hữu cao sau
            var coOwners = await _coOwnerRepository.GetAllAsync();
            var priorityList = coOwners
                .OrderBy(c => c.UsageCount)
                .ThenByDescending(c => c.OwnershipRatio)
                .ToList();

            var topCoOwner = priorityList.First();
            if (request.CoOwnerId != topCoOwner.Id)
                return null;

            var booking = new Booking
            {
                VehicleId = request.VehicleId,
                CoOwnerId = request.CoOwnerId,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Status = "Đặt",
                Note = request.Note
            };

            await _bookingRepository.AddAsync(booking);

            coOwner.UsageCount += 1;
            await _coOwnerRepository.UpdateAsync(coOwner);

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
                Status = booking.Status,
                Note = booking.Note
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
        public async Task<BookingResponse?> UpdateBookingStatusAsync(int bookingId, string status)
        {
            var booking = await _bookingRepository.GetByIdAsync(bookingId);
            if (booking == null) return null;

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
                StartTime = booking.StartTime,
                EndTime = booking.EndTime,
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

        
    }
}

