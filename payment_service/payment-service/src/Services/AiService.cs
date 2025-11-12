using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace PaymentService.Services;

public class AiService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AiService> _logger;
    private readonly string _aiServiceUrl;

    public AiService(HttpClient httpClient, IConfiguration configuration, ILogger<AiService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _aiServiceUrl = configuration["AIServiceUrl"] ?? "http://ai-service:8000";
        _httpClient.BaseAddress = new Uri(_aiServiceUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<CostSharingSuggestionResponse?> GetCostSharingSuggestionAsync(CostSharingSuggestionRequest request)
    {
        try
        {
            var requestBody = new
            {
                vehicle_group_id = request.VehicleGroupId,
                total_cost = request.TotalCost,
                cost_type = request.CostType,
                co_owners = request.CoOwners.Select(co => new
                {
                    id = co.Id,
                    ownership_percentage = co.OwnershipPercentage,
                    usage_hours = co.UsageHours
                }).ToList()
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/api/ai/suggestions/cost-sharing", content);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("AI Service returned status {StatusCode} for cost sharing suggestion", response.StatusCode);
                return null;
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<CostSharingSuggestionResponse>(responseContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            _logger.LogInformation("Received cost sharing suggestion from AI Service using method {Method}", result?.Method);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AI Service for cost sharing suggestion");
            return null; // Return null to allow cost sharing to proceed without AI suggestion
        }
    }
}

