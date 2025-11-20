public class BookingHistoryResponse
{
    public int BookingId { get; set; }
    public int VehicleId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime CheckOutTime { get; set; }
    public decimal? DistanceKm { get; set; }
    public decimal? Cost { get; set; }
    public string? Note { get; set; }
}
