namespace ReportService.Models;

public class CostShareDetailResponse
{
    public Guid Id { get; set; }
    public Guid CostShareId { get; set; }
    public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public int Status { get; set; } // 0 = Pending, 2 = Completed
    public string? Notes { get; set; }
}

