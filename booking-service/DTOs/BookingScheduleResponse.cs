namespace BookingService.DTOs
{
    public class BookingScheduleResponse
    {
        public int VehicleId { get; set; }
        public string VehicleName { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public bool IsOccupied { get; set; } // true = đang sử dụng, false = trống
    }
}
