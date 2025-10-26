using System.ComponentModel.DataAnnotations;

namespace GroupManagementService.Models
{
    public class CreateVoteRequest
    {
        [Required(ErrorMessage = "Topic is required")]
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Topic must be between 1 and 200 characters")]
        public string Topic { get; set; } = string.Empty;
    }
}
