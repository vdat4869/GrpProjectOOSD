// Models/BookingHistory.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingService.Models
{
    public class BookingHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int BookingId { get; set; }

        [Required]
        public int VehicleId { get; set; }

        [Required]
        public int CoOwnerId { get; set; }

        [Required]
        public DateTime StartTime { get; set; }

        [Required]
        public DateTime EndTime { get; set; }

        [Required]
        public DateTime CheckInTime { get; set; }

        [Required]
        public DateTime CheckOutTime { get; set; }

        public decimal? DistanceKm { get; set; }

        public decimal? Cost { get; set; }

        public string? Note { get; set; }

        // Nếu muốn, bạn có thể thêm CreatedAt để biết khi nào lưu
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
