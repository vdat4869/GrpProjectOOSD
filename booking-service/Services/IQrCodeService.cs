namespace BookingService.Services;

public interface IQrCodeService
{
    string GenerateQrCode(int bookingId);
    string GenerateQrCodeImageBase64(string qrCodeData);
    bool ValidateQrCode(string qrCode, int bookingId);
}

