namespace BookingService.DTOs;

public class CheckInRequest
{
    public string? QrCode { get; set; }
    public string? DigitalSignature { get; set; }
}

public class CheckInResponse
{
    public int BookingId { get; set; }
    public DateTime CheckInTime { get; set; }
    public string Message { get; set; } = string.Empty;
}

