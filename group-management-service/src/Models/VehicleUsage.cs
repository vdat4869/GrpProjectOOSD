namespace GroupManagementService.Models
{
    // Bản ghi lịch sử sử dụng xe
    public class VehicleUsage
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        public int MemberId { get; set; }
        public DateTime Date { get; set; }
        public double DistanceKm { get; set; }
        public string? Purpose { get; set; }
    }
}


