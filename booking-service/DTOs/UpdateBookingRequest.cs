using System.ComponentModel.DataAnnotations;

namespace BookingService.DTOs
{
    [EndTimeGreaterThanStartTime]
    public class UpdateBookingRequest
    {
        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EndTime { get; set; }

        public string? Note { get; set; }
    }
}

