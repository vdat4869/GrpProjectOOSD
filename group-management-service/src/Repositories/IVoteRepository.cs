using GroupManagementService.Models;  

namespace GroupManagementService.Repositories
{
    // Interface định nghĩa các phương thức thao tác với cuộc bỏ phiếu
    public interface IVoteRepository
    {
        // Lấy thông tin một cuộc bỏ phiếu theo ID (trả về null nếu không tìm thấy)
        Task<Vote?> GetByIdAsync(int id);
        
        // Thêm một cuộc bỏ phiếu mới vào database và trả về cuộc bỏ phiếu đã được thêm
        Task<Vote> AddAsync(Vote vote);
        
        // Lấy danh sách cuộc bỏ phiếu theo groupId
        Task<IEnumerable<Vote>> GetByGroupIdAsync(int groupId);

        // Xóa một cuộc bỏ phiếu
        Task DeleteAsync(Vote vote);

        // Lưu tất cả thay đổi vào database
        Task SaveChangesAsync();
    }
}
