using System.ComponentModel.DataAnnotations;

namespace BookingService.DTOs
{
    public class UpdateBookingStatusRequest
    {
        [Required]
        public string Status { get; set; } = "Pending"; // ví dụ: Approved, Rejected, Cancelled
    }
}
