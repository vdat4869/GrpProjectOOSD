namespace PaymentService.Microservice.MessageQueue;

// Event types from other services
public class BookingCompletedEvent
{
    public int BookingId { get; set; }
    public int CoOwnerId { get; set; }
    public int VehicleId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public double Distance { get; set; }
    public double Cost { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime CheckOutTime { get; set; }
    public DateTime CompletedAt { get; set; }
}

