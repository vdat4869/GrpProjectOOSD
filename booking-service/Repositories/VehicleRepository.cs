using BookingService.Data;
using BookingService.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingService.Repositories
{
    public class VehicleRepository : IVehicleRepository
    {
        private readonly BookingDbContext _context;

        public VehicleRepository(BookingDbContext context)
        {
            _context = context;
        }

        public async Task<Vehicle?> GetByIdAsync(int id) =>
            await _context.Vehicles.FindAsync(id);

        public async Task<IEnumerable<Vehicle>> GetAllAsync() =>
            await _context.Vehicles.ToListAsync();
    }
}
