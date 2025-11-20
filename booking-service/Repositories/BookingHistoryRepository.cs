// Data/Repositories/BookingHistoryRepository.cs
using BookingService.Data;
using BookingService.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BookingService.Repositories
{
    public class BookingHistoryRepository : IBookingHistoryRepository
    {
        private readonly BookingDbContext _context;
        public BookingHistoryRepository(BookingDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(BookingHistory history)
        {
            await _context.BookingHistories.AddAsync(history);
        }

        public async Task<IEnumerable<BookingHistory>> GetAllAsync()
        {
            return await _context.BookingHistories.ToListAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
        public async Task<IEnumerable<BookingHistory>> GetByCoOwnerIdAsync(int coOwnerId)
        {
            return await _context.BookingHistories
                                .Where(h => h.CoOwnerId == coOwnerId)
                                .OrderByDescending(h => h.CreatedAt)
                                .ToListAsync();
        }

    }
}
