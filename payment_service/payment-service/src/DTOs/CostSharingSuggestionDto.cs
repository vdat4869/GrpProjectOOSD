namespace PaymentService.DTOs;

public class GetCostSharingSuggestionRequest
{
    public Guid GroupId { get; set; }
    public decimal TotalCost { get; set; }
    public string CostType { get; set; } = string.Empty; // maintenance, insurance, charging, cleaning, inspection
}

public class CostSharingSuggestionDto
{
    public string CoOwnerId { get; set; } = string.Empty;
    public decimal SuggestedAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty; // ownership_based, usage_based, hybrid
}

