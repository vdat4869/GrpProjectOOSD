// Data/Repositories/BookingHistoryRepository.cs
using BookingService.Data;
using BookingService.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BookingService.Repositories
{
    /// <summary>
    /// Implementation của IBookingHistoryRepository
    /// Sử dụng Entity Framework Core để truy cập database
    /// </summary>
    public class BookingHistoryRepository : IBookingHistoryRepository
    {
        private readonly BookingDbContext _context;
        
        /// <summary>
        /// Constructor - Dependency Injection
        /// </summary>
        public BookingHistoryRepository(BookingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Thêm bản ghi lịch sử booking mới vào context (chưa lưu vào database)
        /// Cần gọi SaveChangesAsync() để lưu thực sự
        /// </summary>
        public async Task AddAsync(BookingHistory history)
        {
            await _context.BookingHistories.AddAsync(history);
        }

        /// <summary>
        /// Lấy tất cả các bản ghi lịch sử booking từ database
        /// </summary>
        public async Task<IEnumerable<BookingHistory>> GetAllAsync()
        {
            return await _context.BookingHistories.ToListAsync();
        }

        /// <summary>
        /// Lưu tất cả các thay đổi vào database
        /// </summary>
        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
        
        /// <summary>
        /// Lấy lịch sử booking của một co-owner cụ thể
        /// Sắp xếp theo thời gian tạo giảm dần (mới nhất trước)
        /// </summary>
        public async Task<IEnumerable<BookingHistory>> GetByCoOwnerIdAsync(int coOwnerId)
        {
            return await _context.BookingHistories
                                .Where(h => h.CoOwnerId == coOwnerId)
                                .OrderByDescending(h => h.CreatedAt)  // Mới nhất trước
                                .ToListAsync();
        }

    }
}
