using BookingService.Data;
using BookingService.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingService.Repositories
{
    public class CoOwnerRepository : ICoOwnerRepository
    {
        private readonly BookingDbContext _context;

        public CoOwnerRepository(BookingDbContext context)
        {
            _context = context;
        }

        public async Task<CoOwner?> GetByIdAsync(int id) =>
            await _context.CoOwners.FindAsync(id);

        public async Task<IEnumerable<CoOwner>> GetAllAsync() =>
            await _context.CoOwners.ToListAsync();

        public async Task UpdateAsync(CoOwner coOwner)
        {
            _context.CoOwners.Update(coOwner);
            await _context.SaveChangesAsync();
        }
    }
}
