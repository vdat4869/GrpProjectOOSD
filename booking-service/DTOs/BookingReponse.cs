
namespace BookingService.DTOs
{
    public class BookingResponse
    {
        public int Id { get; set; }
        public int VehicleId { get; set; }
        public string? VehicleName { get; set; }
        public int CoOwnerId { get; set; }
        public string? CoOwnerName { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Status { get; set; } = " Đã Đặt";  // <-- thêm đây
        public string? Note { get; set; }
    }

}
