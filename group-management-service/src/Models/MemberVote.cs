namespace GroupManagementService.Models
{
    public class MemberVote
    {
        public int Id { get; set; }
        public int VoteId { get; set; }
        public int MemberId { get; set; }
        public bool Agree { get; set; }
        
        // Navigation properties
        public Vote? Vote { get; set; }
        public Member? Member { get; set; }
    }
}
