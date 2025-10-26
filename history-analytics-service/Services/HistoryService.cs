using HistoryAnalyticsService.DTOs;
using HistoryAnalyticsService.Models;
using HistoryAnalyticsService.Repositories;
using AutoMapper;

namespace HistoryAnalyticsService.Services;

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

    public HistoryService(IHistoryRepository historyRepository, IMapper mapper)
    {
        _historyRepository = historyRepository;
        _mapper = mapper;
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
