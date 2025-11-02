using System.ComponentModel.DataAnnotations;

namespace BookingService.Models
{
    
    public class Vehicle
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Tên phương tiện (ví dụ: “Xe ô tô Mazda 3”).
        /// </summary>
        [Required(ErrorMessage = "Tên phương tiện là bắt buộc.")]
        [StringLength(100, ErrorMessage = "Tên phương tiện không được vượt quá 100 ký tự.")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Trạng thái hoạt động của phương tiện.
        /// </summary>
        public bool IsActive { get; set; } = true;
    }
}
