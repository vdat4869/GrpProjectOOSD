using GroupManagementService.Models;  
using GroupManagementService.Repositories;  

namespace GroupManagementService.Services
{
    // Service class xử lý logic nghiệp vụ liên quan đến bỏ phiếu
    public class VotingService
    {
        // Khai báo repository để tương tác với bảng Votes
        private readonly IVoteRepository _voteRepo;
        
        // Khai báo repository để tương tác với bảng Groups
        private readonly IGroupRepository _groupRepo;

        // Constructor: nhận các repository thông qua dependency injection
        public VotingService(IVoteRepository voteRepo, IGroupRepository groupRepo)
        {
            _voteRepo = voteRepo;  // Gán VoteRepository
            _groupRepo = groupRepo;  // Gán GroupRepository
        }

        // Tạo một cuộc bỏ phiếu mới trong nhóm
        public async Task<Vote> CreateVoteAsync(int groupId, string topic)
        {
            // Kiểm tra nhóm có tồn tại không
            var group = await _groupRepo.GetByIdAsync(groupId);
            // Nếu không tìm thấy nhóm thì ném exception
            if (group == null) throw new Exception("Group not found.");

            // Tạo đối tượng Vote mới với topic và groupId
            var vote = new Vote { Topic = topic, GroupId = groupId };
            // Thêm vote vào danh sách votes của nhóm
            group.Votes.Add(vote);
            // Lưu thay đổi vào database
            await _groupRepo.SaveChangesAsync();
            // Trả về vote vừa tạo
            return vote;
        }

        // Ghi nhận phiếu bầu của một thành viên cho cuộc bỏ phiếu
        public async Task CastVoteAsync(int voteId, int memberId, bool agree)
        {
            // Lấy thông tin cuộc bỏ phiếu theo ID
            var vote = await _voteRepo.GetByIdAsync(voteId);
            // Nếu không tìm thấy cuộc bỏ phiếu thì ném exception
            if (vote == null) throw new Exception("Vote not found.");

            // Kiểm tra thành viên đã bỏ phiếu chưa
            // Check if member already voted
            var existingVote = vote.MemberVotes.FirstOrDefault(mv => mv.MemberId == memberId);
            if (existingVote != null)
            {
                // Nếu đã bỏ phiếu rồi thì cập nhật lại lựa chọn (đồng ý/không đồng ý)
                existingVote.Agree = agree;
            }
            else
            {
                // Nếu chưa bỏ phiếu thì thêm một MemberVote mới
                vote.MemberVotes.Add(new MemberVote 
                { 
                    VoteId = voteId,  // ID cuộc bỏ phiếu
                    MemberId = memberId,  // ID thành viên
                    Agree = agree  // true = đồng ý, false = không đồng ý
                });
            }

            // Tính toán kết quả nếu có đủ phiếu bầu (ít nhất 3 phiếu)
            // Calculate result if we have enough votes (at least 3)
            if (vote.MemberVotes.Count >= 3)
            {
                // Đếm số phiếu đồng ý
                var agreeCount = vote.MemberVotes.Count(mv => mv.Agree);
                // Kết quả là đồng ý nếu số phiếu đồng ý > một nửa tổng số phiếu
                vote.Result = agreeCount > vote.MemberVotes.Count / 2;
                vote.CompletedAt = DateTime.UtcNow;
            }

            // Lưu thay đổi vào database
            await _voteRepo.SaveChangesAsync();
        }

        // Lấy danh sách tất cả cuộc bỏ phiếu trong một nhóm
        public Task<IEnumerable<Vote>> GetVotesByGroupAsync(int groupId) => _voteRepo.GetByGroupIdAsync(groupId);

        // Lấy chi tiết một cuộc bỏ phiếu
        public Task<Vote?> GetVoteByIdAsync(int voteId) => _voteRepo.GetByIdAsync(voteId);

        // Xóa cuộc bỏ phiếu
        public async Task<bool> DeleteVoteAsync(int voteId)
        {
            var vote = await _voteRepo.GetByIdAsync(voteId);
            if (vote == null) return false;
            await _voteRepo.DeleteAsync(vote);
            return true;
        }
    }
}
