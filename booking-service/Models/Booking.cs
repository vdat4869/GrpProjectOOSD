using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using BookingService.DTOs;

namespace BookingService.Models
{
    [EndTimeGreaterThanStartTime]
    public class Booking
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "Phải chọn phương tiện.")]
        public int VehicleId { get; set; }

        /// <summary>
        /// ID của đồng sở hữu thực hiện đặt lịch.
        /// </summary>
        [Required(ErrorMessage = "Phải chọn người đồng sở hữu.")]
        public int CoOwnerId { get; set; }

        /// <summary>
        /// Thời gian bắt đầu đặt xe.
        /// </summary>
        [Required(ErrorMessage = "Thời gian bắt đầu là bắt buộc.")]
        public DateTime StartTime { get; set; }

        /// <summary>
        /// Thời gian kết thúc đặt xe.
        /// </summary>
        [Required(ErrorMessage = "Thời gian kết thúc là bắt buộc.")]
        public DateTime EndTime { get; set; }

        /// <summary>
        /// Trạng thái đặt xe (Pending, Approved, Rejected).
        /// </summary>
        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Đã đặt";

        /// <summary>
        /// Ghi chú bổ sung (nếu có).
        /// </summary>
        [StringLength(255)]
        public string? Note { get; set; }

        /// <summary>
        /// Quãng đường đã đi (km) - được cập nhật khi check-out
        /// </summary>
        [Column(TypeName = "decimal(10,2)")]
        public decimal? DistanceKm { get; set; }

        /// <summary>
        /// Chi phí phát sinh (VND) - được cập nhật khi check-out
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? Cost { get; set; }

        /// <summary>
        /// Thời gian check-in thực tế
        /// </summary>
        public DateTime? CheckInTime { get; set; }

        /// <summary>
        /// Thời gian check-out thực tế
        /// </summary>
        public DateTime? CheckOutTime { get; set; }

        /// <summary>
        /// QR code để check-in/check-out
        /// </summary>
        [StringLength(500)]
        public string? QrCode { get; set; }

        /// <summary>
        /// Chữ ký số khi nhận xe (check-in)
        /// </summary>
        [StringLength(1000)]
        public string? DigitalSignature { get; set; }

        /// <summary>
        /// Quan hệ đến phương tiện.
        /// </summary>
        [ForeignKey(nameof(VehicleId))]
        public Vehicle? Vehicle { get; set; }

        /// <summary>
        /// Quan hệ đến đồng sở hữu.
        /// </summary>
        [ForeignKey(nameof(CoOwnerId))]
        public CoOwner? CoOwner { get; set; }
    }
}
