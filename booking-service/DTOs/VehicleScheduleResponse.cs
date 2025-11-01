using System;

namespace BookingService.DTOs
{
    public class VehicleScheduleResponse
    {
        public int VehicleId { get; set; }
        public string VehicleName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public List<BookingPeriod> Bookings { get; set; } = new();
    }

    public class BookingPeriod
    {
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? CoOwnerName { get; set; }
        public string? Status { get; set; }
    }
}
