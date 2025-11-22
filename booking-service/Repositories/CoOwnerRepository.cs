using BookingService.Data;
using BookingService.Models;
using Microsoft.EntityFrameworkCore;

namespace BookingService.Repositories
{
    /// <summary>
    /// Implementation của ICoOwnerRepository
    /// Sử dụng Entity Framework Core để truy cập database
    /// </summary>
    public class CoOwnerRepository : ICoOwnerRepository
    {
        private readonly BookingDbContext _context;

        /// <summary>
        /// Constructor - Dependency Injection
        /// </summary>
        public CoOwnerRepository(BookingDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lấy co-owner theo ID từ database
        /// </summary>
        public async Task<CoOwner?> GetByIdAsync(int id) =>
            await _context.CoOwners.FindAsync(id);

        /// <summary>
        /// Lấy tất cả các co-owner từ database
        /// </summary>
        public async Task<IEnumerable<CoOwner>> GetAllAsync() =>
            await _context.CoOwners.ToListAsync();

        /// <summary>
        /// Thêm co-owner mới vào context (chưa lưu vào database)
        /// Cần gọi SaveChangesAsync() để lưu thực sự
        /// </summary>
        public async Task AddAsync(CoOwner coOwner)
        {
            await _context.CoOwners.AddAsync(coOwner);
        }

        /// <summary>
        /// Đánh dấu co-owner là đã được chỉnh sửa (chưa lưu vào database)
        /// Cần gọi SaveChangesAsync() để lưu thực sự
        /// </summary>
        public async Task UpdateAsync(CoOwner coOwner)
        {
            _context.CoOwners.Update(coOwner);
        }

        /// <summary>
        /// Lưu tất cả các thay đổi vào database
        /// </summary>
        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
