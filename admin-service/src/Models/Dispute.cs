namespace AdminService.Models
{
    public enum DisputeStatus { Open, Escalated, Resolved, Rejected }

    public class Dispute
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public string Title { get; set; } = default!;
        public string Description { get; set; } = default!;
        public DisputeStatus Status { get; set; } = DisputeStatus.Open;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class DisputeReview
    {
        public int Id { get; set; }
        public int DisputeId { get; set; }
        public string Decision { get; set; } = "Resolved"; // or "Rejected"
        public string? Note { get; set; }
        public DateTime DecidedAt { get; set; } = DateTime.UtcNow;
    }
}
