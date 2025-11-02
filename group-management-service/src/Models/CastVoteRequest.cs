using System.ComponentModel.DataAnnotations;  
namespace GroupManagementService.Models
{
    // Model request dùng để ghi nhận phiếu bầu của thành viên (DTO - Data Transfer Object)
    public class CastVoteRequest
    {
        // ID của thành viên đang bỏ phiếu - bắt buộc phải có
        [Required(ErrorMessage = "Member ID is required")]
        // ID phải là số nguyên dương (từ 1 trở lên)
        [Range(1, int.MaxValue, ErrorMessage = "Member ID must be a positive integer")]
        public int MemberId { get; set; }

        // Lựa chọn của thành viên: true = đồng ý, false = không đồng ý
        // Bắt buộc phải có
        [Required(ErrorMessage = "Agree field is required")]
        public bool Agree { get; set; }
    }
}
