using System.ComponentModel.DataAnnotations;

namespace BookingService.DTOs
{
    public class CreateBookingRequest
    {
        [Required]
        public int VehicleId { get; set; }

        [Required]
        public int CoOwnerId { get; set; }

        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EndTime { get; set; }

        public string? Note { get; set; }
    }
}

