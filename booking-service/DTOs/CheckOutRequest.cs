using System.ComponentModel.DataAnnotations;

namespace BookingService.DTOs;

public class CheckOutRequest
{
    [Required]
    public decimal DistanceKm { get; set; }

    public decimal? Cost { get; set; }

    public string? Note { get; set; }
}

public class CheckOutResponse
{
    public int BookingId { get; set; }
    public DateTime CheckOutTime { get; set; }
    public decimal DistanceKm { get; set; }
    public decimal? Cost { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class QrCodeResponse
{
    public int BookingId { get; set; }
    public string QrCode { get; set; } = string.Empty;
    public string QrCodeImageUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

