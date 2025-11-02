using System.ComponentModel.DataAnnotations;

namespace BookingService.Models
{
    
    public class CoOwner
    {
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
