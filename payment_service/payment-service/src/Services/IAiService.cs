namespace PaymentService.Services;

public interface IAiService
{
    Task<CostSharingSuggestionResponse?> GetCostSharingSuggestionAsync(CostSharingSuggestionRequest request);
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

