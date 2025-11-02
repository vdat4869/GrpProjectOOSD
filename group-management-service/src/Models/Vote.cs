namespace GroupManagementService.Models
{
    // Model đại diện cho một cuộc bỏ phiếu (Vote) trong nhóm
    public class Vote
    {
        // ID duy nhất của cuộc bỏ phiếu (khóa chính)
        public int Id { get; set; }
        
        // Chủ đề/nội dung của cuộc bỏ phiếu
        public string Topic { get; set; } = string.Empty;
        
        // Danh sách các phiếu bầu của thành viên cho cuộc bỏ phiếu này
        public List<MemberVote> MemberVotes { get; set; } = new();
        
        // Kết quả của cuộc bỏ phiếu: null = chưa quyết định, true = đồng ý, false = không đồng ý
        // null = chưa quyết định
        public bool? Result { get; set; }
        
        // ID của nhóm mà cuộc bỏ phiếu này thuộc về (khóa ngoại)
        public int GroupId { get; set; }
        
        // Navigation property: tham chiếu đến nhóm chứa cuộc bỏ phiếu này
        public Group? Group { get; set; }

        // Thời điểm tạo cuộc bỏ phiếu
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Thời điểm hết hạn (tuỳ chọn)
        public DateTime? ExpiresAt { get; set; }

        // Thời điểm hoàn tất (khi đã tính kết quả)
        public DateTime? CompletedAt { get; set; }
    }
}
