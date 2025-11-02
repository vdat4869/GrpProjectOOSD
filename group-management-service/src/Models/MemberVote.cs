namespace GroupManagementService.Models
{
    // Model đại diện cho một phiếu bầu của thành viên (MemberVote) trong cuộc bỏ phiếu
    public class MemberVote
    {
        // ID duy nhất của phiếu bầu (khóa chính)
        public int Id { get; set; }
        
        // ID của cuộc bỏ phiếu mà phiếu bầu này thuộc về (khóa ngoại)
        public int VoteId { get; set; }
        
        // ID của thành viên đã bỏ phiếu (khóa ngoại)
        public int MemberId { get; set; }
        
        // Lựa chọn của thành viên: true = đồng ý, false = không đồng ý
        public bool Agree { get; set; }
        
        // Navigation properties: tham chiếu đến cuộc bỏ phiếu
        public Vote? Vote { get; set; }
        
        // Navigation properties: tham chiếu đến thành viên đã bỏ phiếu
        public Member? Member { get; set; }
    }
}
