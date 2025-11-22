// Data/Repositories/IBookingHistoryRepository.cs
using BookingService.Models;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace BookingService.Repositories
{
    /// <summary>
    /// Interface định nghĩa các phương thức truy cập dữ liệu cho BookingHistory entity
    /// Repository pattern để tách biệt logic truy cập database
    /// </summary>
    public interface IBookingHistoryRepository
    {
        /// <summary>
        /// Thêm bản ghi lịch sử booking mới vào database (chưa lưu, cần gọi SaveChangesAsync)
        /// </summary>
        /// <param name="history">BookingHistory entity cần thêm</param>
        Task AddAsync(BookingHistory history);
        
        /// <summary>
        /// Lấy tất cả các bản ghi lịch sử booking từ database
        /// </summary>
        Task<IEnumerable<BookingHistory>> GetAllAsync();
        
        /// <summary>
        /// Lưu tất cả các thay đổi vào database
        /// </summary>
        Task SaveChangesAsync();
        
        /// <summary>
        /// Lấy lịch sử booking của một co-owner cụ thể
        /// Sắp xếp theo thời gian tạo giảm dần (mới nhất trước)
        /// </summary>
        /// <param name="coOwnerId">ID của co-owner</param>
        /// <returns>Danh sách lịch sử booking của co-owner</returns>
        Task<IEnumerable<BookingHistory>> GetByCoOwnerIdAsync(int coOwnerId);
    }
}
