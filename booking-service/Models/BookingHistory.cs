// Models/BookingHistory.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingService.Models
{
    /// <summary>
    /// Entity đại diện cho lịch sử booking đã hoàn thành
    /// Được tạo tự động khi booking được check-out thành công
    /// Lưu trữ thông tin đầy đủ về việc sử dụng xe: thời gian, quãng đường, chi phí
    /// </summary>
    public class BookingHistory
    {
        /// <summary>
        /// ID duy nhất của bản ghi lịch sử (Primary Key)
        /// </summary>
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// ID của booking gốc (tham chiếu đến Booking)
        /// </summary>
        [Required]
        public int BookingId { get; set; }

        /// <summary>
        /// ID của xe đã sử dụng
        /// </summary>
        [Required]
        public int VehicleId { get; set; }

        /// <summary>
        /// ID của co-owner đã sử dụng xe
        /// </summary>
        [Required]
        public int CoOwnerId { get; set; }

        /// <summary>
        /// Thời gian bắt đầu đặt xe (theo booking gốc)
        /// </summary>
        [Required]
        public DateTime StartTime { get; set; }

        /// <summary>
        /// Thời gian kết thúc đặt xe (theo booking gốc)
        /// </summary>
        [Required]
        public DateTime EndTime { get; set; }

        /// <summary>
        /// Thời gian check-in thực tế (khi nhận xe)
        /// </summary>
        [Required]
        public DateTime CheckInTime { get; set; }

        /// <summary>
        /// Thời gian check-out thực tế (khi trả xe)
        /// </summary>
        [Required]
        public DateTime CheckOutTime { get; set; }

        /// <summary>
        /// Quãng đường đã đi (km) - được cập nhật khi check-out
        /// </summary>
        public decimal? DistanceKm { get; set; }

        /// <summary>
        /// Chi phí phát sinh (VND) - được cập nhật khi check-out
        /// </summary>
        public decimal? Cost { get; set; }

        /// <summary>
        /// Ghi chú bổ sung (nếu có)
        /// </summary>
        public string? Note { get; set; }

        /// <summary>
        /// Thời gian tạo bản ghi lịch sử (khi check-out thành công)
        /// </summary>
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
