namespace AdminService.Models
{
    public class ApproveServiceOrderRequest
    {
        public bool Approve { get; set; }
        public string? Note { get; set; }
    }

    public class ReviewDisputeRequest
    {
        public bool Resolve { get; set; }  // true=Resolved, false=Rejected
        public string? Note { get; set; }
    }

    public class ReportQuery
    {
        public int GroupId { get; set; }
        public string Type { get; set; } = "Financial";
        public DateTime From { get; set; }
        public DateTime To { get; set; }
    }
}
