using System.ComponentModel.DataAnnotations;

namespace BookingService.DTOs
{
    public class UpdateBookingStatusRequest
    {
        [Required]
        public string Status { get; set; } = "Pending"; // Pending, Confirmed, Đã đặt, InProgress, Completed, Cancelled, NoShow
    }
}
