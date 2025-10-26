using System.ComponentModel.DataAnnotations;

namespace GroupManagementService.Models
{
    public class CastVoteRequest
    {
        [Required(ErrorMessage = "Member ID is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Member ID must be a positive integer")]
        public int MemberId { get; set; }

        [Required(ErrorMessage = "Agree field is required")]
        public bool Agree { get; set; }
    }
}
