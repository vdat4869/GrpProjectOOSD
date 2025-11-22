using BookingService.Models;
using System.Threading.Tasks;
using BookingService.Repositories;
namespace BookingService.Repositories
{
    /// <summary>
    /// Interface định nghĩa các phương thức truy cập dữ liệu cho CoOwner entity
    /// Repository pattern để tách biệt logic truy cập database
    /// </summary>
    public interface ICoOwnerRepository
    {
        /// <summary>
        /// Lấy co-owner theo ID
        /// </summary>
        /// <param name="id">ID của co-owner</param>
        /// <returns>CoOwner nếu tìm thấy, null nếu không</returns>
        Task<CoOwner?> GetByIdAsync(int id);
        
        /// <summary>
        /// Lấy tất cả các co-owner từ database
        /// </summary>
        Task<IEnumerable<CoOwner>> GetAllAsync();
        
        /// <summary>
        /// Thêm co-owner mới vào database (chưa lưu, cần gọi SaveChangesAsync)
        /// </summary>
        /// <param name="coOwner">CoOwner entity cần thêm</param>
        Task AddAsync(CoOwner coOwner);
        
        /// <summary>
        /// Cập nhật co-owner đã tồn tại (chưa lưu, cần gọi SaveChangesAsync)
        /// </summary>
        /// <param name="coOwner">CoOwner entity đã được chỉnh sửa</param>
        Task UpdateAsync(CoOwner coOwner);
        
        /// <summary>
        /// Lưu tất cả các thay đổi vào database
        /// </summary>
        Task SaveChangesAsync();
    }
}
