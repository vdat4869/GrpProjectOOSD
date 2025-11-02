using System.ComponentModel.DataAnnotations;  

namespace GroupManagementService.Models
{
    // Model request dùng để tạo cuộc bỏ phiếu mới (DTO - Data Transfer Object)
    public class CreateVoteRequest
    {
        // Chủ đề/nội dung của cuộc bỏ phiếu - bắt buộc phải có
        [Required(ErrorMessage = "Topic is required")]
        // Độ dài chủ đề phải từ 1 đến 200 ký tự
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Topic must be between 1 and 200 characters")]
        public string Topic { get; set; } = string.Empty;
    }
}
