using BookingService.Data;
using BookingService.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingService.Repositories
{
    /// <summary>
    /// Implementation của IVehicleRepository
    /// Sử dụng Entity Framework Core để truy cập database
    /// </summary>
    public class VehicleRepository : IVehicleRepository
    {
        private readonly BookingDbContext _context;

        /// <summary>
        /// Constructor - Dependency Injection
        /// </summary>
        public VehicleRepository(BookingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy vehicle theo ID từ database
        /// </summary>
        public async Task<Vehicle?> GetByIdAsync(int id) =>
            await _context.Vehicles.FindAsync(id);

        /// <summary>
        /// Lấy tất cả các vehicle từ database
        /// </summary>
        public async Task<IEnumerable<Vehicle>> GetAllAsync() =>
            await _context.Vehicles.ToListAsync();
    }
}
