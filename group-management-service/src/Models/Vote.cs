namespace GroupManagementService.Models
{
    public class Vote
    {
        public int Id { get; set; }
        public string Topic { get; set; } = string.Empty;
        public List<MemberVote> MemberVotes { get; set; } = new();
        public bool? Result { get; set; } // null = chưa quyết định
        public int GroupId { get; set; }
        
        // Navigation property
        public Group? Group { get; set; }
    }
}
