using BookingService.Models;
using System.Threading.Tasks;
using BookingService.Repositories;
namespace BookingService.Repositories
{
    /// <summary>
    /// Interface định nghĩa các phương thức truy cập dữ liệu cho Vehicle entity
    /// Repository pattern để tách biệt logic truy cập database
    /// </summary>
    public interface IVehicleRepository
    {
        /// <summary>
        /// Lấy vehicle theo ID
        /// </summary>
        /// <param name="id">ID của vehicle</param>
        /// <returns>Vehicle nếu tìm thấy, null nếu không</returns>
        Task<Vehicle?> GetByIdAsync(int id);
        
        /// <summary>
        /// Lấy tất cả các vehicle từ database
        /// </summary>
        Task<IEnumerable<Vehicle>> GetAllAsync();
    }
}
