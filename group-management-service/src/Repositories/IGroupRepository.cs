using GroupManagementService.Models;  

namespace GroupManagementService.Repositories
{
    // Interface định nghĩa các phương thức thao tác với nhóm
    public interface IGroupRepository
    {
        // Lấy danh sách tất cả các nhóm
        Task<IEnumerable<Group>> GetAllAsync();
        
        // Lấy thông tin một nhóm theo ID (trả về null nếu không tìm thấy)
        Task<Group?> GetByIdAsync(int id);
        
        // Thêm một nhóm mới vào database và trả về nhóm đã được thêm
        Task<Group> AddAsync(Group group);
        
        // Cập nhật nhóm hiện có
        Task UpdateAsync(Group group);
        
        // Xóa nhóm
        Task DeleteAsync(Group group);
        
        // Thêm thành viên vào nhóm
        Task AddMemberAsync(Group group, Member member);
        
        // Xóa thành viên khỏi nhóm
        Task RemoveMemberAsync(Group group, int memberId);
        
        // Lưu tất cả thay đổi vào database
        Task SaveChangesAsync();
    }
}
