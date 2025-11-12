using QRCoder;
using System.Security.Cryptography;
using System.Text;

namespace BookingService.Services;

public class QrCodeService : IQrCodeService
{
    private readonly ILogger<QrCodeService> _logger;
    private readonly string _secretKey;

    public QrCodeService(ILogger<QrCodeService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _secretKey = configuration["QrCode:SecretKey"] ?? "DefaultSecretKeyForQRCode2024";
    }

    public string GenerateQrCode(int bookingId)
    {
        try
        {
            // Generate a secure token for the booking
            var timestamp = DateTime.UtcNow.Ticks;
            var data = $"{bookingId}|{timestamp}";
            var hash = ComputeHash(data);
            var qrCodeData = $"{bookingId}|{timestamp}|{hash}";
            
            _logger.LogInformation("Generated QR code for booking {BookingId}", bookingId);
            return qrCodeData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating QR code for booking {BookingId}", bookingId);
            throw;
        }
    }

    public string GenerateQrCodeImageBase64(string qrCodeData)
    {
        try
        {
            using var qrGenerator = new QRCodeGenerator();
            var qrCodeData_qr = qrGenerator.CreateQrCode(qrCodeData, QRCodeGenerator.ECCLevel.Q);
            using var qrCode = new PngByteQRCode(qrCodeData_qr);
            var qrCodeBytes = qrCode.GetGraphic(20);
            return Convert.ToBase64String(qrCodeBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating QR code image");
            throw;
        }
    }

    public bool ValidateQrCode(string qrCode, int bookingId)
    {
        try
        {
            var parts = qrCode.Split('|');
            if (parts.Length != 3)
                return false;

            if (!int.TryParse(parts[0], out var qrBookingId) || qrBookingId != bookingId)
                return false;

            // Check if QR code is not too old (24 hours)
            if (long.TryParse(parts[1], out var timestamp))
            {
                var qrTime = new DateTime(timestamp);
                if (DateTime.UtcNow - qrTime > TimeSpan.FromHours(24))
                {
                    _logger.LogWarning("QR code expired for booking {BookingId}", bookingId);
                    return false;
                }
            }

            // Validate hash
            var data = $"{parts[0]}|{parts[1]}";
            var expectedHash = ComputeHash(data);
            return parts[2] == expectedHash;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating QR code");
            return false;
        }
    }

    private string ComputeHash(string data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_secretKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToBase64String(hashBytes);
    }
}

