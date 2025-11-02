using BookingService.Data;
using BookingService.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingService.Repositories
{
    public class BookingRepository : IBookingRepository
    {
        private readonly BookingDbContext _context;

        public BookingRepository(BookingDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Booking>> GetAllAsync() =>
            await _context.Bookings.ToListAsync();

        public async Task<Booking?> GetByIdAsync(int id) =>
            await _context.Bookings.FindAsync(id);

        public async Task AddAsync(Booking booking)
        {
            await _context.Bookings.AddAsync(booking);
        }

        public async Task SaveChangesAsync() =>
            await _context.SaveChangesAsync();

        public async Task UpdateAsync(Booking booking)
        {
            _context.Bookings.Update(booking);
            await _context.SaveChangesAsync();
        }

    }
}
