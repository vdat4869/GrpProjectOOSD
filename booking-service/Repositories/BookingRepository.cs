using BookingService.Data;
using BookingService.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingService.Repositories
{
    /// <summary>
    /// Implementation của IBookingRepository
    /// Sử dụng Entity Framework Core để truy cập database
    /// </summary>
    public class BookingRepository : IBookingRepository
    {
        private readonly BookingDbContext _context;

        /// <summary>
        /// Constructor - Dependency Injection
        /// </summary>
        public BookingRepository(BookingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy tất cả các booking từ database
        /// Include thông tin CoOwner và Vehicle để tránh lazy loading
        /// </summary>
        public async Task<IEnumerable<Booking>> GetAllAsync() =>
            await _context.Bookings
                .Include(b => b.CoOwner)      // Eager load CoOwner
                .Include(b => b.Vehicle)      // Eager load Vehicle
                .ToListAsync();

        /// <summary>
        /// Lấy booking theo ID
        /// Include thông tin CoOwner và Vehicle
        /// </summary>
        public async Task<Booking?> GetByIdAsync(int id) =>
            await _context.Bookings
                .Include(b => b.Vehicle)
                .Include(b => b.CoOwner)
                .FirstOrDefaultAsync(b => b.Id == id);

        /// <summary>
        /// Thêm booking mới vào context (chưa lưu vào database)
        /// Cần gọi SaveChangesAsync() để lưu thực sự
        /// </summary>
        public async Task AddAsync(Booking booking)
        {
            await _context.Bookings.AddAsync(booking);
        }

        /// <summary>
        /// Lưu tất cả các thay đổi vào database
        /// </summary>
        public async Task SaveChangesAsync() =>
            await _context.SaveChangesAsync();

        /// <summary>
        /// Đánh dấu booking là đã được chỉnh sửa (chưa lưu vào database)
        /// Cần gọi SaveChangesAsync() để lưu thực sự
        /// </summary>
        public async Task UpdateAsync(Booking booking)
        {
            _context.Bookings.Update(booking);
            await Task.CompletedTask;
        }
        
        /// <summary>
        /// Đánh dấu booking cần xóa (chưa xóa khỏi database)
        /// Cần gọi SaveChangesAsync() để xóa thực sự
        /// </summary>
        public async Task RemoveAsync(Booking booking)
        {
            _context.Bookings.Remove(booking);  // Đánh dấu để xóa
            await Task.CompletedTask;           // Giữ async signature
        }

    }
}
