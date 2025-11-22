using BookingService.Models;
using BookingService.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;
namespace BookingService.Repositories
{
    /// <summary>
    /// Interface định nghĩa các phương thức truy cập dữ liệu cho Booking entity
    /// Repository pattern để tách biệt logic truy cập database
    /// </summary>
    public interface IBookingRepository
    {
        /// <summary>
        /// Lấy tất cả các booking từ database (kèm thông tin Vehicle và CoOwner)
        /// </summary>
        Task<IEnumerable<Booking>> GetAllAsync();
        
        /// <summary>
        /// Lấy booking theo ID (kèm thông tin Vehicle và CoOwner)
        /// </summary>
        /// <param name="id">ID của booking</param>
        /// <returns>Booking nếu tìm thấy, null nếu không</returns>
        Task<Booking?> GetByIdAsync(int id);
        
        /// <summary>
        /// Thêm booking mới vào database (chưa lưu, cần gọi SaveChangesAsync)
        /// </summary>
        /// <param name="booking">Booking entity cần thêm</param>
        Task AddAsync(Booking booking);
        
        /// <summary>
        /// Lưu tất cả các thay đổi vào database
        /// </summary>
        Task SaveChangesAsync();
        
        /// <summary>
        /// Cập nhật booking đã tồn tại (chưa lưu, cần gọi SaveChangesAsync)
        /// </summary>
        /// <param name="booking">Booking entity đã được chỉnh sửa</param>
        Task UpdateAsync(Booking booking);
        
        /// <summary>
        /// Xóa booking khỏi database (chưa lưu, cần gọi SaveChangesAsync)
        /// </summary>
        /// <param name="booking">Booking entity cần xóa</param>
        Task RemoveAsync(Booking booking);
    }
}
