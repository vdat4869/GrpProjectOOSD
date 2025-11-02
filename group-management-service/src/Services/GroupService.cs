using GroupManagementService.Models;  
using GroupManagementService.Repositories;  

namespace GroupManagementService.Services
{
    // Service class xử lý logic nghiệp vụ liên quan đến nhóm
    public class GroupService
    {
        // Khai báo repository để tương tác với database
        private readonly IGroupRepository _repo;
        
        // Constructor: nhận IGroupRepository thông qua dependency injection và gán vào _repo
        public GroupService(IGroupRepository repo) => _repo = repo;

        // Lấy danh sách tất cả các nhóm từ repository
        public Task<IEnumerable<Group>> GetAllGroupsAsync() => _repo.GetAllAsync();
        
        // Lấy thông tin một nhóm theo ID từ repository (trả về null nếu không tìm thấy)
        public Task<Group?> GetGroupByIdAsync(int id) => _repo.GetByIdAsync(id);
        
        // Tạo một nhóm mới thông qua repository và trả về nhóm đã được tạo
        public Task<Group> CreateGroupAsync(Group group) => _repo.AddAsync(group);

        // Cập nhật tên nhóm
        public async Task<Group?> UpdateGroupAsync(int id, string name)
        {
            var group = await _repo.GetByIdAsync(id);
            if (group == null) return null;
            group.Name = name;
            await _repo.UpdateAsync(group);
            return group;
        }

        // Xóa nhóm theo ID
        public async Task<bool> DeleteGroupAsync(int id)
        {
            var group = await _repo.GetByIdAsync(id);
            if (group == null) return false;
            await _repo.DeleteAsync(group);
            return true;
        }

        // Thêm thành viên vào nhóm
        public async Task<Group?> AddMemberAsync(int groupId, Member member)
        {
            var group = await _repo.GetByIdAsync(groupId);
            if (group == null) return null;
            await _repo.AddMemberAsync(group, member);
            return group;
        }

        // Xóa thành viên khỏi nhóm
        public async Task<bool> RemoveMemberAsync(int groupId, int memberId)
        {
            var group = await _repo.GetByIdAsync(groupId);
            if (group == null) return false;
            await _repo.RemoveMemberAsync(group, memberId);
            return true;
        }
    }
}
