namespace BookingService.Services;

public interface IAiService
{
    Task<BookingSuggestionResponse?> GetBookingSuggestionAsync(BookingSuggestionRequest request);
    Task<CostSharingSuggestionResponse?> GetCostSharingSuggestionAsync(CostSharingSuggestionRequest request);
}

public class BookingSuggestionRequest
{
    public string VehicleGroupId { get; set; } = string.Empty;
    public DateTime RequestedStart { get; set; }
    public DateTime RequestedEnd { get; set; }
    public string CoOwnerId { get; set; } = string.Empty;
    public double OwnershipPercentage { get; set; }
    public List<Dictionary<string, object>>? UsageHistory { get; set; }
}

public class BookingSuggestionResponse
{
    public DateTime SuggestedStart { get; set; }
    public DateTime SuggestedEnd { get; set; }
    public double FairnessScore { get; set; }
    public string Reason { get; set; } = string.Empty;
    public List<Dictionary<string, DateTime>>? AlternativeSlots { get; set; }
}

public class CostSharingSuggestionRequest
{
    public string VehicleGroupId { get; set; } = string.Empty;
    public double TotalCost { get; set; }
    public string CostType { get; set; } = string.Empty;
    public List<CoOwnerCostInfo> CoOwners { get; set; } = new();
}

public class CoOwnerCostInfo
{
    public string Id { get; set; } = string.Empty;
    public double OwnershipPercentage { get; set; }
    public double UsageHours { get; set; }
}

public class CostSharingSuggestionResponse
{
    public List<CostSharingSuggestion> Suggestions { get; set; } = new();
    public double TotalSuggested { get; set; }
    public string Method { get; set; } = string.Empty;
}

public class CostSharingSuggestion
{
    public string CoOwnerId { get; set; } = string.Empty;
    public double SuggestedAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
}

