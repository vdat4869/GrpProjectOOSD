using GroupManagementService.Data;  
using GroupManagementService.Models;  
using Microsoft.EntityFrameworkCore;  

namespace GroupManagementService.Repositories
{
    // Class GroupRepository triển khai interface IGroupRepository
    // Chịu trách nhiệm thao tác với database cho entity Group
    public class GroupRepository : IGroupRepository
    {
        // Khai báo DbContext để truy cập database
        private readonly AppDbContext _context;
        
        // Constructor: nhận AppDbContext thông qua dependency injection và gán vào _context
        public GroupRepository(AppDbContext context) => _context = context;

        // Lấy danh sách tất cả các nhóm kèm theo danh sách thành viên của mỗi nhóm
        public async Task<IEnumerable<Group>> GetAllAsync() =>
            // Include để eager load danh sách Members, tránh lazy loading
            await _context.Groups.Include(g => g.Members).ToListAsync();

        // Lấy thông tin một nhóm theo ID kèm theo danh sách thành viên, votes và member votes
        public async Task<Group?> GetByIdAsync(int id) =>
            await _context.Groups
                .Include(g => g.Members)  // Load danh sách thành viên
                .Include(g => g.Votes)  // Load danh sách cuộc bỏ phiếu
                    .ThenInclude(v => v.MemberVotes)  // Load danh sách phiếu bầu của mỗi cuộc bỏ phiếu
                .FirstOrDefaultAsync(g => g.Id == id);  // Tìm nhóm theo ID, trả về null nếu không tìm thấy

        // Thêm một nhóm mới vào database
        public async Task<Group> AddAsync(Group group)
        {
            // Thêm nhóm vào DbSet Groups (chưa lưu vào database)
            _context.Groups.Add(group);
            // Lưu thay đổi vào database
            await _context.SaveChangesAsync();
            // Trả về nhóm đã được thêm (có ID được database tự động gán)
            return group;
        }

        // Cập nhật nhóm hiện có
        public async Task UpdateAsync(Group group)
        {
            _context.Groups.Update(group);
            await _context.SaveChangesAsync();
        }

        // Xóa nhóm
        public async Task DeleteAsync(Group group)
        {
            _context.Groups.Remove(group);
            await _context.SaveChangesAsync();
        }

        // Thêm thành viên vào nhóm
        public async Task AddMemberAsync(Group group, Member member)
        {
            group.Members.Add(member);
            await _context.SaveChangesAsync();
        }

        // Xóa thành viên khỏi nhóm theo memberId
        public async Task RemoveMemberAsync(Group group, int memberId)
        {
            var toRemove = group.Members.FirstOrDefault(m => m.Id == memberId);
            if (toRemove != null)
            {
                group.Members.Remove(toRemove);
                _context.Remove(toRemove);
                await _context.SaveChangesAsync();
            }
        }

        // Lưu tất cả thay đổi vào database
        public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
    }
}
