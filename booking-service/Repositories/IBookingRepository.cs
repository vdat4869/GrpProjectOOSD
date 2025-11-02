using BookingService.Models;
using BookingService.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;
namespace BookingService.Repositories
{
    public interface IBookingRepository
    {
        Task<IEnumerable<Booking>> GetAllAsync();
        Task<Booking?> GetByIdAsync(int id);
        Task AddAsync(Booking booking);
        Task SaveChangesAsync();
        Task UpdateAsync(Booking booking);

    }
}
