using ReportService.DTOs;
using ReportService.Models;
using ReportService.Repositories;
using AutoMapper;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace ReportService.Services;

/// <summary>
/// Interface cho History Service
/// </summary>
public interface IHistoryService
{
    Task<ApiResponse<UsageHistoryDto>> CreateUsageHistoryAsync(CreateUsageHistoryRequest request);
    Task<ApiResponse<UsageHistoryDto>> GetUsageHistoryByIdAsync(int id);
    Task<ApiResponse<List<UsageHistoryDto>>> GetUsageHistoriesByVehicleIdAsync(int vehicleId);
    Task<ApiResponse<List<UsageHistoryDto>>> GetUsageHistoriesByCoOwnerIdAsync(int coOwnerId);
    Task<ApiResponse<List<UsageHistoryDto>>> GetUsageHistoriesByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<ApiResponse<bool>> DeleteUsageHistoryAsync(int id);

    Task<ApiResponse<ChargingSessionDto>> CreateChargingSessionAsync(CreateChargingSessionRequest request);
    Task<ApiResponse<ChargingSessionDto>> GetChargingSessionByIdAsync(int id);
    Task<ApiResponse<List<ChargingSessionDto>>> GetChargingSessionsByVehicleIdAsync(int vehicleId);
    Task<ApiResponse<List<ChargingSessionDto>>> GetChargingSessionsByCoOwnerIdAsync(int coOwnerId);
    Task<ApiResponse<List<ChargingSessionDto>>> GetChargingSessionsByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<ApiResponse<bool>> DeleteChargingSessionAsync(int id);

    Task<ApiResponse<MaintenanceRecordDto>> CreateMaintenanceRecordAsync(CreateMaintenanceRecordRequest request);
    Task<ApiResponse<MaintenanceRecordDto>> GetMaintenanceRecordByIdAsync(int id);
    Task<ApiResponse<List<MaintenanceRecordDto>>> GetMaintenanceRecordsByVehicleIdAsync(int vehicleId);
    Task<ApiResponse<List<MaintenanceRecordDto>>> GetMaintenanceRecordsByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<ApiResponse<MaintenanceRecordDto>> UpdateMaintenanceRecordAsync(int id, UpdateMaintenanceRecordRequest request);
    Task<ApiResponse<MaintenanceRecordDto>> MarkMaintenanceAsCompletedAsync(int id);
    Task<ApiResponse<bool>> DeleteMaintenanceRecordAsync(int id);

    Task<ApiResponse<CostRecordDto>> CreateCostRecordAsync(CreateCostRecordRequest request);
    Task<ApiResponse<CostRecordDto>> GetCostRecordByIdAsync(int id);
    Task<ApiResponse<List<CostRecordDto>>> GetCostRecordsByVehicleIdAsync(int vehicleId);
    Task<ApiResponse<List<CostRecordDto>>> GetCostRecordsByCoOwnerIdAsync(int coOwnerId);
    Task<ApiResponse<List<CostRecordDto>>> GetCostRecordsByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<ApiResponse<bool>> DeleteCostRecordAsync(int id);
}

/// <summary>
/// Service xử lý business logic cho History
/// </summary>
public class HistoryService : IHistoryService
{
    private readonly IHistoryRepository _historyRepository;
    private readonly IMapper _mapper;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<HistoryService>? _logger;

    public HistoryService(
        IHistoryRepository historyRepository, 
        IMapper mapper,
        HttpClient httpClient,
        IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor,
        ILogger<HistoryService>? logger = null)
    {
        _historyRepository = historyRepository;
        _mapper = mapper;
        _httpClient = httpClient;
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    #region UsageHistory Operations

    /// <summary>
    /// Tạo lịch sử sử dụng mới
    /// </summary>
    public async Task<ApiResponse<UsageHistoryDto>> CreateUsageHistoryAsync(CreateUsageHistoryRequest request)
    {
        try
        {
            var usageHistory = _mapper.Map<UsageHistory>(request);
            var createdUsageHistory = await _historyRepository.CreateUsageHistoryAsync(usageHistory);

            var usageHistoryDto = _mapper.Map<UsageHistoryDto>(createdUsageHistory);
            return new ApiResponse<UsageHistoryDto>
            {
                Success = true,
                Message = "Tạo lịch sử sử dụng thành công",
                Data = usageHistoryDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<UsageHistoryDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi tạo lịch sử sử dụng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy lịch sử sử dụng theo ID
    /// </summary>
    public async Task<ApiResponse<UsageHistoryDto>> GetUsageHistoryByIdAsync(int id)
    {
        try
        {
            var usageHistory = await _historyRepository.GetUsageHistoryByIdAsync(id);
            if (usageHistory == null)
            {
                return new ApiResponse<UsageHistoryDto>
                {
                    Success = false,
                    Message = "Không tìm thấy lịch sử sử dụng",
                    Errors = new List<string> { "UsageHistoryNotFound" }
                };
            }

            var usageHistoryDto = _mapper.Map<UsageHistoryDto>(usageHistory);
            return new ApiResponse<UsageHistoryDto>
            {
                Success = true,
                Message = "Lấy lịch sử sử dụng thành công",
                Data = usageHistoryDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<UsageHistoryDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy lịch sử sử dụng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách lịch sử sử dụng theo xe
    /// </summary>
    public async Task<ApiResponse<List<UsageHistoryDto>>> GetUsageHistoriesByVehicleIdAsync(int vehicleId)
    {
        try
        {
            var usageHistories = await _historyRepository.GetUsageHistoriesByVehicleIdAsync(vehicleId);
            var usageHistoryDtos = _mapper.Map<List<UsageHistoryDto>>(usageHistories);

            return new ApiResponse<List<UsageHistoryDto>>
            {
                Success = true,
                Message = "Lấy danh sách lịch sử sử dụng theo xe thành công",
                Data = usageHistoryDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<UsageHistoryDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách lịch sử sử dụng theo xe",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách lịch sử sử dụng theo chủ sở hữu
    /// </summary>
    public async Task<ApiResponse<List<UsageHistoryDto>>> GetUsageHistoriesByCoOwnerIdAsync(int coOwnerId)
    {
        try
        {
            var usageHistories = await _historyRepository.GetUsageHistoriesByCoOwnerIdAsync(coOwnerId);
            var usageHistoryDtos = _mapper.Map<List<UsageHistoryDto>>(usageHistories);

            return new ApiResponse<List<UsageHistoryDto>>
            {
                Success = true,
                Message = "Lấy danh sách lịch sử sử dụng theo chủ sở hữu thành công",
                Data = usageHistoryDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<UsageHistoryDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách lịch sử sử dụng theo chủ sở hữu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách lịch sử sử dụng theo khoảng thời gian
    /// </summary>
    public async Task<ApiResponse<List<UsageHistoryDto>>> GetUsageHistoriesByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            var usageHistories = await _historyRepository.GetUsageHistoriesByDateRangeAsync(startDate, endDate);
            var usageHistoryDtos = _mapper.Map<List<UsageHistoryDto>>(usageHistories);

            return new ApiResponse<List<UsageHistoryDto>>
            {
                Success = true,
                Message = "Lấy danh sách lịch sử sử dụng theo khoảng thời gian thành công",
                Data = usageHistoryDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<UsageHistoryDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách lịch sử sử dụng theo khoảng thời gian",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Xóa lịch sử sử dụng
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteUsageHistoryAsync(int id)
    {
        try
        {
            var result = await _historyRepository.DeleteUsageHistoryAsync(id);
            if (!result)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Không tìm thấy lịch sử sử dụng",
                    Errors = new List<string> { "UsageHistoryNotFound" }
                };
            }

            return new ApiResponse<bool>
            {
                Success = true,
                Message = "Xóa lịch sử sử dụng thành công",
                Data = true
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi xóa lịch sử sử dụng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    #endregion

    #region ChargingSession Operations

    /// <summary>
    /// Tạo phiên sạc mới
    /// </summary>
    public async Task<ApiResponse<ChargingSessionDto>> CreateChargingSessionAsync(CreateChargingSessionRequest request)
    {
        try
        {
            var chargingSession = _mapper.Map<ChargingSession>(request);
            var createdChargingSession = await _historyRepository.CreateChargingSessionAsync(chargingSession);

            var chargingSessionDto = _mapper.Map<ChargingSessionDto>(createdChargingSession);
            return new ApiResponse<ChargingSessionDto>
            {
                Success = true,
                Message = "Tạo phiên sạc thành công",
                Data = chargingSessionDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<ChargingSessionDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi tạo phiên sạc",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy phiên sạc theo ID
    /// </summary>
    public async Task<ApiResponse<ChargingSessionDto>> GetChargingSessionByIdAsync(int id)
    {
        try
        {
            var chargingSession = await _historyRepository.GetChargingSessionByIdAsync(id);
            if (chargingSession == null)
            {
                return new ApiResponse<ChargingSessionDto>
                {
                    Success = false,
                    Message = "Không tìm thấy phiên sạc",
                    Errors = new List<string> { "ChargingSessionNotFound" }
                };
            }

            var chargingSessionDto = _mapper.Map<ChargingSessionDto>(chargingSession);
            return new ApiResponse<ChargingSessionDto>
            {
                Success = true,
                Message = "Lấy phiên sạc thành công",
                Data = chargingSessionDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<ChargingSessionDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy phiên sạc",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách phiên sạc theo xe
    /// </summary>
    public async Task<ApiResponse<List<ChargingSessionDto>>> GetChargingSessionsByVehicleIdAsync(int vehicleId)
    {
        try
        {
            var chargingSessions = await _historyRepository.GetChargingSessionsByVehicleIdAsync(vehicleId);
            var chargingSessionDtos = _mapper.Map<List<ChargingSessionDto>>(chargingSessions);

            return new ApiResponse<List<ChargingSessionDto>>
            {
                Success = true,
                Message = "Lấy danh sách phiên sạc theo xe thành công",
                Data = chargingSessionDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<ChargingSessionDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách phiên sạc theo xe",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách phiên sạc theo chủ sở hữu
    /// </summary>
    public async Task<ApiResponse<List<ChargingSessionDto>>> GetChargingSessionsByCoOwnerIdAsync(int coOwnerId)
    {
        try
        {
            var chargingSessions = await _historyRepository.GetChargingSessionsByCoOwnerIdAsync(coOwnerId);
            var chargingSessionDtos = _mapper.Map<List<ChargingSessionDto>>(chargingSessions);

            return new ApiResponse<List<ChargingSessionDto>>
            {
                Success = true,
                Message = "Lấy danh sách phiên sạc theo chủ sở hữu thành công",
                Data = chargingSessionDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<ChargingSessionDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách phiên sạc theo chủ sở hữu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách phiên sạc theo khoảng thời gian
    /// </summary>
    public async Task<ApiResponse<List<ChargingSessionDto>>> GetChargingSessionsByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            var chargingSessions = await _historyRepository.GetChargingSessionsByDateRangeAsync(startDate, endDate);
            var chargingSessionDtos = _mapper.Map<List<ChargingSessionDto>>(chargingSessions);

            return new ApiResponse<List<ChargingSessionDto>>
            {
                Success = true,
                Message = "Lấy danh sách phiên sạc theo khoảng thời gian thành công",
                Data = chargingSessionDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<ChargingSessionDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách phiên sạc theo khoảng thời gian",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Xóa phiên sạc
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteChargingSessionAsync(int id)
    {
        try
        {
            var result = await _historyRepository.DeleteChargingSessionAsync(id);
            if (!result)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Không tìm thấy phiên sạc",
                    Errors = new List<string> { "ChargingSessionNotFound" }
                };
            }

            return new ApiResponse<bool>
            {
                Success = true,
                Message = "Xóa phiên sạc thành công",
                Data = true
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi xóa phiên sạc",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    #endregion

    #region MaintenanceRecord Operations

    /// <summary>
    /// Tạo bản ghi bảo dưỡng mới
    /// </summary>
    public async Task<ApiResponse<MaintenanceRecordDto>> CreateMaintenanceRecordAsync(CreateMaintenanceRecordRequest request)
    {
        try
        {
            var maintenanceRecord = _mapper.Map<MaintenanceRecord>(request);
            var createdMaintenanceRecord = await _historyRepository.CreateMaintenanceRecordAsync(maintenanceRecord);

            var maintenanceRecordDto = _mapper.Map<MaintenanceRecordDto>(createdMaintenanceRecord);
            return new ApiResponse<MaintenanceRecordDto>
            {
                Success = true,
                Message = "Tạo bản ghi bảo dưỡng thành công",
                Data = maintenanceRecordDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<MaintenanceRecordDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi tạo bản ghi bảo dưỡng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy bản ghi bảo dưỡng theo ID
    /// </summary>
    public async Task<ApiResponse<MaintenanceRecordDto>> GetMaintenanceRecordByIdAsync(int id)
    {
        try
        {
            var maintenanceRecord = await _historyRepository.GetMaintenanceRecordByIdAsync(id);
            if (maintenanceRecord == null)
            {
                return new ApiResponse<MaintenanceRecordDto>
                {
                    Success = false,
                    Message = "Không tìm thấy bản ghi bảo dưỡng",
                    Errors = new List<string> { "MaintenanceRecordNotFound" }
                };
            }

            var maintenanceRecordDto = _mapper.Map<MaintenanceRecordDto>(maintenanceRecord);
            return new ApiResponse<MaintenanceRecordDto>
            {
                Success = true,
                Message = "Lấy bản ghi bảo dưỡng thành công",
                Data = maintenanceRecordDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<MaintenanceRecordDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy bản ghi bảo dưỡng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách bản ghi bảo dưỡng theo xe
    /// </summary>
    public async Task<ApiResponse<List<MaintenanceRecordDto>>> GetMaintenanceRecordsByVehicleIdAsync(int vehicleId)
    {
        try
        {
            var maintenanceRecords = await _historyRepository.GetMaintenanceRecordsByVehicleIdAsync(vehicleId);
            var maintenanceRecordDtos = _mapper.Map<List<MaintenanceRecordDto>>(maintenanceRecords);

            return new ApiResponse<List<MaintenanceRecordDto>>
            {
                Success = true,
                Message = "Lấy danh sách bản ghi bảo dưỡng theo xe thành công",
                Data = maintenanceRecordDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<MaintenanceRecordDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách bản ghi bảo dưỡng theo xe",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách bản ghi bảo dưỡng theo khoảng thời gian
    /// </summary>
    public async Task<ApiResponse<List<MaintenanceRecordDto>>> GetMaintenanceRecordsByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            var maintenanceRecords = await _historyRepository.GetMaintenanceRecordsByDateRangeAsync(startDate, endDate);
            var maintenanceRecordDtos = _mapper.Map<List<MaintenanceRecordDto>>(maintenanceRecords);

            return new ApiResponse<List<MaintenanceRecordDto>>
            {
                Success = true,
                Message = "Lấy danh sách bản ghi bảo dưỡng theo khoảng thời gian thành công",
                Data = maintenanceRecordDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<MaintenanceRecordDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách bản ghi bảo dưỡng theo khoảng thời gian",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Cập nhật bản ghi bảo dưỡng
    /// </summary>
    public async Task<ApiResponse<MaintenanceRecordDto>> UpdateMaintenanceRecordAsync(int id, UpdateMaintenanceRecordRequest request)
    {
        try
        {
            var maintenanceRecord = await _historyRepository.GetMaintenanceRecordByIdAsync(id);
            if (maintenanceRecord == null)
            {
                return new ApiResponse<MaintenanceRecordDto>
                {
                    Success = false,
                    Message = "Không tìm thấy bản ghi bảo dưỡng",
                    Errors = new List<string> { "MaintenanceRecordNotFound" }
                };
            }

            // Update only provided fields
            if (!string.IsNullOrEmpty(request.MaintenanceType))
                maintenanceRecord.MaintenanceType = request.MaintenanceType;
            if (request.Description != null)
                maintenanceRecord.Description = request.Description;
            if (request.ServiceProvider != null)
                maintenanceRecord.ServiceProvider = request.ServiceProvider;
            if (request.Cost.HasValue)
                maintenanceRecord.Cost = request.Cost.Value;
            if (request.MileageAtService.HasValue)
                maintenanceRecord.MileageAtService = request.MileageAtService.Value;
            if (request.ServiceDate.HasValue)
                maintenanceRecord.ServiceDate = request.ServiceDate.Value;
            if (request.NextServiceDue.HasValue)
                maintenanceRecord.NextServiceDue = request.NextServiceDue.Value;
            if (request.Notes != null)
                maintenanceRecord.Notes = request.Notes;
            if (request.Status.HasValue)
                maintenanceRecord.Status = request.Status.Value;

            var updatedRecord = await _historyRepository.UpdateMaintenanceRecordAsync(maintenanceRecord);
            var maintenanceRecordDto = _mapper.Map<MaintenanceRecordDto>(updatedRecord);

            return new ApiResponse<MaintenanceRecordDto>
            {
                Success = true,
                Message = "Cập nhật bản ghi bảo dưỡng thành công",
                Data = maintenanceRecordDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<MaintenanceRecordDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi cập nhật bản ghi bảo dưỡng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Đánh dấu bảo dưỡng hoàn thành và tạo cost share
    /// </summary>
    public async Task<ApiResponse<MaintenanceRecordDto>> MarkMaintenanceAsCompletedAsync(int id)
    {
        try
        {
            var maintenanceRecord = await _historyRepository.GetMaintenanceRecordByIdAsync(id);
            if (maintenanceRecord == null)
            {
                return new ApiResponse<MaintenanceRecordDto>
                {
                    Success = false,
                    Message = "Không tìm thấy bản ghi bảo dưỡng",
                    Errors = new List<string> { "MaintenanceRecordNotFound" }
                };
            }

            if (maintenanceRecord.Status == MaintenanceStatus.Completed)
            {
                return new ApiResponse<MaintenanceRecordDto>
                {
                    Success = false,
                    Message = "Bản ghi bảo dưỡng đã được đánh dấu hoàn thành",
                    Errors = new List<string> { "AlreadyCompleted" }
                };
            }

            // Update status to Completed
            maintenanceRecord.Status = MaintenanceStatus.Completed;
            var updatedRecord = await _historyRepository.UpdateMaintenanceRecordAsync(maintenanceRecord);

            // Create cost share in payment service if cost > 0
            string? costShareError = null;
            if (maintenanceRecord.Cost > 0)
            {
                try
                {
                    await CreateCostShareForMaintenanceAsync(maintenanceRecord);
                    _logger?.LogInformation("Successfully created cost share for maintenance {MaintenanceId}", id);
                }
                catch (Exception ex)
                {
                    costShareError = ex.Message;
                    _logger?.LogError(ex, "Failed to create cost share for maintenance {MaintenanceId}: {ErrorMessage}", id, ex.Message);
                    // Continue even if cost share creation fails - maintenance is still marked as completed
                    // The error is logged but doesn't prevent the maintenance from being marked as completed
                }
            }

            // Update vehicle status if needed
            try
            {
                await UpdateVehicleStatusIfNeededAsync(maintenanceRecord.VehicleId);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to update vehicle status for vehicle {VehicleId}", maintenanceRecord.VehicleId);
                // Continue even if vehicle status update fails
            }

            var maintenanceRecordDto = _mapper.Map<MaintenanceRecordDto>(updatedRecord);
            var responseMessage = "Đánh dấu bảo dưỡng hoàn thành thành công";
            if (!string.IsNullOrEmpty(costShareError))
            {
                responseMessage += $". Lưu ý: Không thể tạo cost share tự động: {costShareError}";
            }
            
            return new ApiResponse<MaintenanceRecordDto>
            {
                Success = true,
                Message = responseMessage,
                Data = maintenanceRecordDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<MaintenanceRecordDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi đánh dấu bảo dưỡng hoàn thành",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Helper method to forward Authorization header from current request
    /// </summary>
    private void AddAuthorizationHeader(HttpRequestMessage request)
    {
        var authHeader = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(authHeader))
        {
            request.Headers.Add("Authorization", authHeader);
        }
    }

    /// <summary>
    /// Tạo cost share trong payment service
    /// </summary>
    private async Task CreateCostShareForMaintenanceAsync(MaintenanceRecord maintenanceRecord)
    {
        var ownershipServiceUrl = _configuration["OwnershipServiceUrl"] ?? "http://ownership-service:80";
        var paymentServiceUrl = _configuration["PaymentServiceUrl"] ?? "http://payment-service:80";

        try
        {
            // Step 1: Get all vehicle groups from ownership service
            var groupsRequest = new HttpRequestMessage(HttpMethod.Get, $"{ownershipServiceUrl}/api/vehiclegroups");
            AddAuthorizationHeader(groupsRequest);
            var groupsResponse = await _httpClient.SendAsync(groupsRequest);
            if (!groupsResponse.IsSuccessStatusCode)
            {
                _logger?.LogWarning("Failed to get vehicle groups: {StatusCode}", groupsResponse.StatusCode);
                throw new Exception($"Failed to get vehicle groups: {groupsResponse.StatusCode}");
            }

            var groupsJson = await groupsResponse.Content.ReadAsStringAsync();
            var groups = JsonSerializer.Deserialize<List<VehicleGroupResponse>>(groupsJson, new JsonSerializerOptions 
            { 
                PropertyNameCaseInsensitive = true 
            }) ?? new List<VehicleGroupResponse>();

            // Step 2: Find vehicle group that matches vehicleId
            // Convert Guid to int the same way frontend does: parse first 8 hex chars
            Guid? matchedGroupId = null;
            foreach (var group in groups)
            {
                if (Guid.TryParse(group.Id, out var groupGuid))
                {
                    var groupIdAsInt = Convert.ToInt32(groupGuid.ToString().Replace("-", "").Substring(0, 8), 16);
                    if (groupIdAsInt == maintenanceRecord.VehicleId)
                    {
                        matchedGroupId = groupGuid;
                        break;
                    }
                }
            }

            if (!matchedGroupId.HasValue)
            {
                _logger?.LogError("Could not find vehicle group for vehicleId {VehicleId}. Cannot create cost share.", maintenanceRecord.VehicleId);
                throw new Exception($"Could not find vehicle group for vehicleId {maintenanceRecord.VehicleId}. Cannot create cost share.");
            }

            // Step 3: Get ownerships for the matched group
            List<OwnershipResponse> ownerships = new List<OwnershipResponse>();
            var ownershipsRequest = new HttpRequestMessage(HttpMethod.Get,
                $"{ownershipServiceUrl}/api/ownerships/vehicle-group/{matchedGroupId.Value}?isActive=true");
            AddAuthorizationHeader(ownershipsRequest);
            var ownershipsResponse = await _httpClient.SendAsync(ownershipsRequest);
            
            if (!ownershipsResponse.IsSuccessStatusCode)
            {
                _logger?.LogError("Failed to get ownerships for group {GroupId}: {StatusCode}", matchedGroupId.Value, ownershipsResponse.StatusCode);
                throw new Exception($"Failed to get ownerships for group {matchedGroupId.Value}: {ownershipsResponse.StatusCode}");
            }

            var ownershipsJson = await ownershipsResponse.Content.ReadAsStringAsync();
            ownerships = JsonSerializer.Deserialize<List<OwnershipResponse>>(ownershipsJson, new JsonSerializerOptions 
            { 
                PropertyNameCaseInsensitive = true 
            }) ?? new List<OwnershipResponse>();

            if (!ownerships.Any())
            {
                _logger?.LogError("No active ownerships found for group {GroupId}. Cannot create cost share.", matchedGroupId.Value);
                throw new Exception($"No active ownerships found for group {matchedGroupId.Value}. Cannot create cost share.");
            }

            // Step 4: Create cost share details based on ownership percentages
            var costShareDetails = new List<object>();
            foreach (var ownership in ownerships.Where(o => o.IsActive))
            {
                var amount = (double)(maintenanceRecord.Cost * ownership.OwnershipPercentage / 100m);
                costShareDetails.Add(new
                {
                    userId = ownership.CoOwnerId.ToString(),
                    ownershipPercentage = ownership.OwnershipPercentage,
                    amount = amount
                });
            }

            // Step 5: Create cost share request
            var costShareRequest = new
            {
                groupId = matchedGroupId?.ToString() ?? Guid.Empty.ToString(),
                vehicleId = maintenanceRecord.VehicleId.ToString(),
                costType = 2, // Maintenance
                title = $"Bảo dưỡng: {maintenanceRecord.MaintenanceType}",
                description = maintenanceRecord.Description ?? $"Bảo dưỡng xe - {maintenanceRecord.MaintenanceType}",
                totalAmount = (double)maintenanceRecord.Cost,
                currency = "VND",
                dueDate = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ"),
                receiptUrl = (string?)null,
                costShareDetails = costShareDetails
            };

            var json = JsonSerializer.Serialize(costShareRequest);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // Forward Authorization header from current request
            var paymentRequest = new HttpRequestMessage(HttpMethod.Post, $"{paymentServiceUrl}/api/costshares")
            {
                Content = content
            };
            AddAuthorizationHeader(paymentRequest);

            _logger?.LogInformation("Calling payment service to create cost share: {Url}", $"{paymentServiceUrl}/api/costshares");
            var response = await _httpClient.SendAsync(paymentRequest);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger?.LogError("Failed to create cost share: {StatusCode} - {Error}", response.StatusCode, errorContent);
                throw new Exception($"Failed to create cost share: {response.StatusCode} - {errorContent}");
            }
            
            var responseContent = await response.Content.ReadAsStringAsync();
            _logger?.LogInformation("Cost share created successfully for maintenance {MaintenanceId} with {DetailCount} details: {Response}", 
                maintenanceRecord.Id, costShareDetails.Count, responseContent);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error creating cost share for maintenance {MaintenanceId}", maintenanceRecord.Id);
            throw;
        }
    }

    // Helper classes for deserializing API responses
    private class VehicleGroupResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string VehicleName { get; set; } = string.Empty;
    }

    private class OwnershipResponse
    {
        public string CoOwnerId { get; set; } = string.Empty;
        public decimal OwnershipPercentage { get; set; }
        public bool IsActive { get; set; }
    }

    /// <summary>
    /// Cập nhật trạng thái xe nếu cần
    /// </summary>
    private async Task UpdateVehicleStatusIfNeededAsync(int vehicleId)
    {
        // Check if there are any active maintenance records
        var activeMaintenances = await _historyRepository.GetMaintenanceRecordsByVehicleIdAsync(vehicleId);
        var hasActiveMaintenance = activeMaintenances.Any(m => 
            m.IsActive && 
            m.Status != MaintenanceStatus.Completed && 
            m.ServiceDate <= DateTime.UtcNow);

        var ownershipServiceUrl = _configuration["OwnershipServiceUrl"] ?? "http://ownership-service:80";
        
        // Map vehicleId to VehicleGroupId (simplified - might need proper mapping)
        // For now, we'll skip this as it requires proper vehicleId to groupId mapping
        _logger?.LogInformation("Vehicle status update skipped - requires vehicleId to groupId mapping");
    }

    /// <summary>
    /// Xóa bản ghi bảo dưỡng
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteMaintenanceRecordAsync(int id)
    {
        try
        {
            var result = await _historyRepository.DeleteMaintenanceRecordAsync(id);
            if (!result)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Không tìm thấy bản ghi bảo dưỡng",
                    Errors = new List<string> { "MaintenanceRecordNotFound" }
                };
            }

            return new ApiResponse<bool>
            {
                Success = true,
                Message = "Xóa bản ghi bảo dưỡng thành công",
                Data = true
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi xóa bản ghi bảo dưỡng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    #endregion

    #region CostRecord Operations

    /// <summary>
    /// Tạo bản ghi chi phí mới
    /// </summary>
    public async Task<ApiResponse<CostRecordDto>> CreateCostRecordAsync(CreateCostRecordRequest request)
    {
        try
        {
            var costRecord = _mapper.Map<CostRecord>(request);
            var createdCostRecord = await _historyRepository.CreateCostRecordAsync(costRecord);

            var costRecordDto = _mapper.Map<CostRecordDto>(createdCostRecord);
            return new ApiResponse<CostRecordDto>
            {
                Success = true,
                Message = "Tạo bản ghi chi phí thành công",
                Data = costRecordDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<CostRecordDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi tạo bản ghi chi phí",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy bản ghi chi phí theo ID
    /// </summary>
    public async Task<ApiResponse<CostRecordDto>> GetCostRecordByIdAsync(int id)
    {
        try
        {
            var costRecord = await _historyRepository.GetCostRecordByIdAsync(id);
            if (costRecord == null)
            {
                return new ApiResponse<CostRecordDto>
                {
                    Success = false,
                    Message = "Không tìm thấy bản ghi chi phí",
                    Errors = new List<string> { "CostRecordNotFound" }
                };
            }

            var costRecordDto = _mapper.Map<CostRecordDto>(costRecord);
            return new ApiResponse<CostRecordDto>
            {
                Success = true,
                Message = "Lấy bản ghi chi phí thành công",
                Data = costRecordDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<CostRecordDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy bản ghi chi phí",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách bản ghi chi phí theo xe
    /// </summary>
    public async Task<ApiResponse<List<CostRecordDto>>> GetCostRecordsByVehicleIdAsync(int vehicleId)
    {
        try
        {
            var costRecords = await _historyRepository.GetCostRecordsByVehicleIdAsync(vehicleId);
            var costRecordDtos = _mapper.Map<List<CostRecordDto>>(costRecords);

            return new ApiResponse<List<CostRecordDto>>
            {
                Success = true,
                Message = "Lấy danh sách bản ghi chi phí theo xe thành công",
                Data = costRecordDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<CostRecordDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách bản ghi chi phí theo xe",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách bản ghi chi phí theo chủ sở hữu
    /// </summary>
    public async Task<ApiResponse<List<CostRecordDto>>> GetCostRecordsByCoOwnerIdAsync(int coOwnerId)
    {
        try
        {
            var costRecords = await _historyRepository.GetCostRecordsByCoOwnerIdAsync(coOwnerId);
            var costRecordDtos = _mapper.Map<List<CostRecordDto>>(costRecords);

            return new ApiResponse<List<CostRecordDto>>
            {
                Success = true,
                Message = "Lấy danh sách bản ghi chi phí theo chủ sở hữu thành công",
                Data = costRecordDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<CostRecordDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách bản ghi chi phí theo chủ sở hữu",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách bản ghi chi phí theo khoảng thời gian
    /// </summary>
    public async Task<ApiResponse<List<CostRecordDto>>> GetCostRecordsByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            var costRecords = await _historyRepository.GetCostRecordsByDateRangeAsync(startDate, endDate);
            var costRecordDtos = _mapper.Map<List<CostRecordDto>>(costRecords);

            return new ApiResponse<List<CostRecordDto>>
            {
                Success = true,
                Message = "Lấy danh sách bản ghi chi phí theo khoảng thời gian thành công",
                Data = costRecordDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<CostRecordDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách bản ghi chi phí theo khoảng thời gian",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Xóa bản ghi chi phí
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteCostRecordAsync(int id)
    {
        try
        {
            var result = await _historyRepository.DeleteCostRecordAsync(id);
            if (!result)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Không tìm thấy bản ghi chi phí",
                    Errors = new List<string> { "CostRecordNotFound" }
                };
            }

            return new ApiResponse<bool>
            {
                Success = true,
                Message = "Xóa bản ghi chi phí thành công",
                Data = true
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi xóa bản ghi chi phí",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    #endregion
}
