namespace AdminService.Models
{
    public enum ServiceOrderStatus { Open, PendingApproval, Approved, Rejected, Closed }

    public class ServiceOrder
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public decimal EstimatedCost { get; set; }
        public ServiceOrderStatus Status { get; set; } = ServiceOrderStatus.Open;
        public string? VendorName { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ServiceOrderApproval
    {
        public int Id { get; set; }
        public int ServiceOrderId { get; set; }
        public string Decision { get; set; } = "Approved"; // or "Rejected"
        public string? Note { get; set; }
        public DateTime DecidedAt { get; set; } = DateTime.UtcNow;
    }
}
