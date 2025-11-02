using System.ComponentModel.DataAnnotations;  
namespace GroupManagementService.Models
{
    // Model request dùng để tạo nhóm mới (DTO - Data Transfer Object)
    public class CreateGroupRequest
    {
        // Tên của nhóm - bắt buộc phải có
        [Required(ErrorMessage = "Group name is required")]
        // Độ dài tên nhóm phải từ 1 đến 100 ký tự
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Group name must be between 1 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        // Danh sách các thành viên sẽ được thêm vào nhóm
        public List<CreateMemberRequest> Members { get; set; } = new();
    }

    // Model request dùng để tạo thành viên mới trong nhóm
    public class CreateMemberRequest
    {
        // Tên đầy đủ của thành viên - bắt buộc phải có
        [Required(ErrorMessage = "Member full name is required")]
        // Độ dài tên thành viên phải từ 1 đến 100 ký tự
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Member full name must be between 1 and 100 characters")]
        public string FullName { get; set; } = string.Empty;

        // Cờ xác định thành viên có phải là đồng sở hữu hay không
        // Mặc định là false (thành viên thường)
        public bool IsCoOwner { get; set; } = false;
    }

    // DTO cập nhật thông tin nhóm
    public class UpdateGroupRequest
    {
        [Required(ErrorMessage = "Group name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Group name must be between 1 and 100 characters")]
        public string Name { get; set; } = string.Empty;
    }

    // DTO thêm thành viên vào nhóm hiện có
    public class AddMemberRequest
    {
        [Required(ErrorMessage = "Member full name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Member full name must be between 1 and 100 characters")]
        public string FullName { get; set; } = string.Empty;

        public bool IsCoOwner { get; set; } = false;
    }
}
