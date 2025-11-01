namespace AdminService.Models
{
    public class ReportSnapshot
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public string Type { get; set; } = "Financial"; // Financial/Usage/...
        public decimal TotalCost { get; set; }
        public decimal FundBalance { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}
