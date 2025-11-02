using BookingService.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BookingService.Services
{
    public interface IBookingService
    {
        Task<IEnumerable<VehicleScheduleResponse>> GetVehicleSchedulesAsync();
        Task<IEnumerable<BookingResponse>> GetAllBookingsAsync();
        Task<BookingResponse?> CreateBookingAsync(CreateBookingRequest request);
        Task<BookingResponse?> UpdateBookingAsync(int bookingId, UpdateBookingRequest request);
        Task<BookingResponse?> UpdateBookingStatusAsync(int bookingId, string status);
        Task<bool> CancelBookingAsync(int bookingId);
        
    }
}

