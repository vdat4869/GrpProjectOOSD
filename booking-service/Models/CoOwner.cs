using System.ComponentModel.DataAnnotations;

namespace BookingService.Models
{
    /// <summary>
    /// Entity đại diện cho một đồng sở hữu (co-owner) trong hệ thống
    /// Mỗi co-owner có tỷ lệ sở hữu và số lần sử dụng xe
    /// Tỷ lệ sở hữu ảnh hưởng đến quyền ưu tiên khi đặt xe
    /// </summary>
    public class CoOwner
    {
        /// <summary>
        /// ID duy nhất của co-owner (Primary Key)
        /// </summary>
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Tên của đồng sở hữu.
        /// </summary>
        [Required(ErrorMessage = "Tên đồng sở hữu là bắt buộc.")]
        [StringLength(100, ErrorMessage = "Tên không được vượt quá 100 ký tự.")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Tỉ lệ phần trăm sở hữu phương tiện (0 - 100%).
        /// </summary>
        [Range(0, 100, ErrorMessage = "Tỉ lệ sở hữu phải từ 0 đến 100.")]
        public decimal OwnershipRatio { get; set; }

        /// <summary>
        /// Số lần sử dụng phương tiện trong lịch sử.
        /// </summary>
        [Range(0, int.MaxValue, ErrorMessage = "Số lần sử dụng không được âm.")]
        public int UsageCount { get; set; } = 0;
    }
}
