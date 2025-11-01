using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BookingService.Models
{
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
