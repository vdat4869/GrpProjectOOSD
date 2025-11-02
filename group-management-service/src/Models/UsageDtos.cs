using System.ComponentModel.DataAnnotations;

namespace GroupManagementService.Models
{
    public class UsageLogRequest
    {
        [Required]
        public int MemberId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Range(0, double.MaxValue)]
        public double DistanceKm { get; set; }

        public string? Purpose { get; set; }
    }

    public class UsageAnalysisResponse
    {
        public double TotalKm { get; set; }
        public Dictionary<int, double> MemberKm { get; set; } = new();
        public Dictionary<int, double> MemberPercentage { get; set; } = new();
    }

    public class UsageSuggestionResponse
    {
        public List<int> SuggestedPriorityMemberIds { get; set; } = new();
        public string Rationale { get; set; } = "Ưu tiên thành viên có mức sử dụng thấp hơn";
    }
}


