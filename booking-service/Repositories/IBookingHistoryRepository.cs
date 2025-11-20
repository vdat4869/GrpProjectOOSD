// Data/Repositories/IBookingHistoryRepository.cs
using BookingService.Models;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace BookingService.Repositories
{
    public interface IBookingHistoryRepository
    {
        Task AddAsync(BookingHistory history);
        Task<IEnumerable<BookingHistory>> GetAllAsync();
        Task SaveChangesAsync();
        Task<IEnumerable<BookingHistory>> GetByCoOwnerIdAsync(int coOwnerId);

    }
}
