namespace GroupManagementService.Models
{
    // Giao dịch của quỹ (nạp/rút)
    public class FundTransaction
    {
        public int Id { get; set; }
        public int FundId { get; set; }
        public decimal Amount { get; set; }  // >0 nạp, <0 rút
        public string Type { get; set; } = string.Empty; // deposit | withdraw
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Fund? Fund { get; set; }
    }
}


