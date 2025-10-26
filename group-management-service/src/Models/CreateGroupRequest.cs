using System.ComponentModel.DataAnnotations;

namespace GroupManagementService.Models
{
    public class CreateGroupRequest
    {
        [Required(ErrorMessage = "Group name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Group name must be between 1 and 100 characters")]
        public string Name { get; set; } = string.Empty;

        public List<CreateMemberRequest> Members { get; set; } = new();
    }

    public class CreateMemberRequest
    {
        [Required(ErrorMessage = "Member full name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Member full name must be between 1 and 100 characters")]
        public string FullName { get; set; } = string.Empty;

        public bool IsCoOwner { get; set; } = false;
    }
}
