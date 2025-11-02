using GroupManagementService.Data;  
using GroupManagementService.Models;  
using Microsoft.EntityFrameworkCore;  

namespace GroupManagementService.Repositories
{
    // Class VoteRepository triển khai interface IVoteRepository
    // Chịu trách nhiệm thao tác với database cho entity Vote
    public class VoteRepository : IVoteRepository
    {
        // Khai báo DbContext để truy cập database
        private readonly AppDbContext _context;
        
        // Constructor: nhận AppDbContext thông qua dependency injection và gán vào _context
        public VoteRepository(AppDbContext context) => _context = context;

        // Lấy thông tin một cuộc bỏ phiếu theo ID kèm theo danh sách phiếu bầu của thành viên
        public async Task<Vote?> GetByIdAsync(int id) => 
            await _context.Votes
                .Include(v => v.MemberVotes)  // Load danh sách phiếu bầu của thành viên
                .FirstOrDefaultAsync(v => v.Id == id);  // Tìm cuộc bỏ phiếu theo ID, trả về null nếu không tìm thấy

        // Thêm một cuộc bỏ phiếu mới vào database
        public async Task<Vote> AddAsync(Vote vote)
        {
            // Thêm cuộc bỏ phiếu vào DbSet Votes (chưa lưu vào database)
            _context.Votes.Add(vote);
            // Lưu thay đổi vào database
            await _context.SaveChangesAsync();
            // Trả về cuộc bỏ phiếu đã được thêm (có ID được database tự động gán)
            return vote;
        }

        // Lấy danh sách cuộc bỏ phiếu theo groupId
        public async Task<IEnumerable<Vote>> GetByGroupIdAsync(int groupId) =>
            await _context.Votes
                .Include(v => v.MemberVotes)
                .Where(v => v.GroupId == groupId)
                .ToListAsync();

        // Xóa một cuộc bỏ phiếu
        public async Task DeleteAsync(Vote vote)
        {
            _context.Votes.Remove(vote);
            await _context.SaveChangesAsync();
        }

        // Lưu tất cả thay đổi vào database
        public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
    }
}
