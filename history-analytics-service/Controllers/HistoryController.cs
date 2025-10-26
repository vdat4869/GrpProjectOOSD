using Microsoft.AspNetCore.Mvc;
using HistoryAnalyticsService.DTOs;
using HistoryAnalyticsService.Services;
using Microsoft.AspNetCore.Authorization;

namespace HistoryAnalyticsService.Controllers;

/// <summary>
/// Controller xử lý lịch sử sử dụng và phân tích dữ liệu
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HistoryController : ControllerBase
{
    private readonly IHistoryService _historyService;

    public HistoryController(IHistoryService historyService)
    {
        _historyService = historyService;
    }

    #region UsageHistory Endpoints

    /// <summary>
    /// Tạo lịch sử sử dụng mới
    /// </summary>
    /// <param name="request">Thông tin lịch sử sử dụng</param>
    /// <returns>Thông tin lịch sử sử dụng đã tạo</returns>
    [HttpPost("usage")]
    public async Task<ActionResult<ApiResponse<UsageHistoryDto>>> CreateUsageHistory([FromBody] CreateUsageHistoryRequest request)
    {
        var result = await _historyService.CreateUsageHistoryAsync(request);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy lịch sử sử dụng theo ID
    /// </summary>
    /// <param name="id">ID lịch sử sử dụng</param>
    /// <returns>Thông tin lịch sử sử dụng</returns>
    [HttpGet("usage/{id}")]
    public async Task<ActionResult<ApiResponse<UsageHistoryDto>>> GetUsageHistoryById(int id)
    {
        var result = await _historyService.GetUsageHistoryByIdAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách lịch sử sử dụng theo xe
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <returns>Danh sách lịch sử sử dụng</returns>
    [HttpGet("usage/vehicle/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<List<UsageHistoryDto>>>> GetUsageHistoriesByVehicleId(int vehicleId)
    {
        var result = await _historyService.GetUsageHistoriesByVehicleIdAsync(vehicleId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách lịch sử sử dụng theo chủ sở hữu
    /// </summary>
    /// <param name="coOwnerId">ID chủ sở hữu</param>
    /// <returns>Danh sách lịch sử sử dụng</returns>
    [HttpGet("usage/co-owner/{coOwnerId}")]
    public async Task<ActionResult<ApiResponse<List<UsageHistoryDto>>>> GetUsageHistoriesByCoOwnerId(int coOwnerId)
    {
        var result = await _historyService.GetUsageHistoriesByCoOwnerIdAsync(coOwnerId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách lịch sử sử dụng theo khoảng thời gian
    /// </summary>
    /// <param name="startDate">Ngày bắt đầu</param>
    /// <param name="endDate">Ngày kết thúc</param>
    /// <returns>Danh sách lịch sử sử dụng</returns>
    [HttpGet("usage/date-range")]
    public async Task<ActionResult<ApiResponse<List<UsageHistoryDto>>>> GetUsageHistoriesByDateRange(
        [FromQuery] DateTime startDate, 
        [FromQuery] DateTime endDate)
    {
        var result = await _historyService.GetUsageHistoriesByDateRangeAsync(startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xóa lịch sử sử dụng
    /// </summary>
    /// <param name="id">ID lịch sử sử dụng</param>
    /// <returns>Kết quả xóa</returns>
    [HttpDelete("usage/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUsageHistory(int id)
    {
        var result = await _historyService.DeleteUsageHistoryAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    #endregion

    #region ChargingSession Endpoints

    /// <summary>
    /// Tạo phiên sạc mới
    /// </summary>
    /// <param name="request">Thông tin phiên sạc</param>
    /// <returns>Thông tin phiên sạc đã tạo</returns>
    [HttpPost("charging")]
    public async Task<ActionResult<ApiResponse<ChargingSessionDto>>> CreateChargingSession([FromBody] CreateChargingSessionRequest request)
    {
        var result = await _historyService.CreateChargingSessionAsync(request);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy phiên sạc theo ID
    /// </summary>
    /// <param name="id">ID phiên sạc</param>
    /// <returns>Thông tin phiên sạc</returns>
    [HttpGet("charging/{id}")]
    public async Task<ActionResult<ApiResponse<ChargingSessionDto>>> GetChargingSessionById(int id)
    {
        var result = await _historyService.GetChargingSessionByIdAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiên sạc theo xe
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <returns>Danh sách phiên sạc</returns>
    [HttpGet("charging/vehicle/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<List<ChargingSessionDto>>>> GetChargingSessionsByVehicleId(int vehicleId)
    {
        var result = await _historyService.GetChargingSessionsByVehicleIdAsync(vehicleId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiên sạc theo chủ sở hữu
    /// </summary>
    /// <param name="coOwnerId">ID chủ sở hữu</param>
    /// <returns>Danh sách phiên sạc</returns>
    [HttpGet("charging/co-owner/{coOwnerId}")]
    public async Task<ActionResult<ApiResponse<List<ChargingSessionDto>>>> GetChargingSessionsByCoOwnerId(int coOwnerId)
    {
        var result = await _historyService.GetChargingSessionsByCoOwnerIdAsync(coOwnerId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách phiên sạc theo khoảng thời gian
    /// </summary>
    /// <param name="startDate">Ngày bắt đầu</param>
    /// <param name="endDate">Ngày kết thúc</param>
    /// <returns>Danh sách phiên sạc</returns>
    [HttpGet("charging/date-range")]
    public async Task<ActionResult<ApiResponse<List<ChargingSessionDto>>>> GetChargingSessionsByDateRange(
        [FromQuery] DateTime startDate, 
        [FromQuery] DateTime endDate)
    {
        var result = await _historyService.GetChargingSessionsByDateRangeAsync(startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xóa phiên sạc
    /// </summary>
    /// <param name="id">ID phiên sạc</param>
    /// <returns>Kết quả xóa</returns>
    [HttpDelete("charging/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteChargingSession(int id)
    {
        var result = await _historyService.DeleteChargingSessionAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    #endregion

    #region MaintenanceRecord Endpoints

    /// <summary>
    /// Tạo bản ghi bảo dưỡng mới
    /// </summary>
    /// <param name="request">Thông tin bảo dưỡng</param>
    /// <returns>Thông tin bảo dưỡng đã tạo</returns>
    [HttpPost("maintenance")]
    public async Task<ActionResult<ApiResponse<MaintenanceRecordDto>>> CreateMaintenanceRecord([FromBody] CreateMaintenanceRecordRequest request)
    {
        var result = await _historyService.CreateMaintenanceRecordAsync(request);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy bản ghi bảo dưỡng theo ID
    /// </summary>
    /// <param name="id">ID bản ghi bảo dưỡng</param>
    /// <returns>Thông tin bảo dưỡng</returns>
    [HttpGet("maintenance/{id}")]
    public async Task<ActionResult<ApiResponse<MaintenanceRecordDto>>> GetMaintenanceRecordById(int id)
    {
        var result = await _historyService.GetMaintenanceRecordByIdAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bản ghi bảo dưỡng theo xe
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <returns>Danh sách bảo dưỡng</returns>
    [HttpGet("maintenance/vehicle/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<List<MaintenanceRecordDto>>>> GetMaintenanceRecordsByVehicleId(int vehicleId)
    {
        var result = await _historyService.GetMaintenanceRecordsByVehicleIdAsync(vehicleId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bản ghi bảo dưỡng theo khoảng thời gian
    /// </summary>
    /// <param name="startDate">Ngày bắt đầu</param>
    /// <param name="endDate">Ngày kết thúc</param>
    /// <returns>Danh sách bảo dưỡng</returns>
    [HttpGet("maintenance/date-range")]
    public async Task<ActionResult<ApiResponse<List<MaintenanceRecordDto>>>> GetMaintenanceRecordsByDateRange(
        [FromQuery] DateTime startDate, 
        [FromQuery] DateTime endDate)
    {
        var result = await _historyService.GetMaintenanceRecordsByDateRangeAsync(startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xóa bản ghi bảo dưỡng
    /// </summary>
    /// <param name="id">ID bản ghi bảo dưỡng</param>
    /// <returns>Kết quả xóa</returns>
    [HttpDelete("maintenance/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMaintenanceRecord(int id)
    {
        var result = await _historyService.DeleteMaintenanceRecordAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    #endregion

    #region CostRecord Endpoints

    /// <summary>
    /// Tạo bản ghi chi phí mới
    /// </summary>
    /// <param name="request">Thông tin chi phí</param>
    /// <returns>Thông tin chi phí đã tạo</returns>
    [HttpPost("cost")]
    public async Task<ActionResult<ApiResponse<CostRecordDto>>> CreateCostRecord([FromBody] CreateCostRecordRequest request)
    {
        var result = await _historyService.CreateCostRecordAsync(request);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy bản ghi chi phí theo ID
    /// </summary>
    /// <param name="id">ID bản ghi chi phí</param>
    /// <returns>Thông tin chi phí</returns>
    [HttpGet("cost/{id}")]
    public async Task<ActionResult<ApiResponse<CostRecordDto>>> GetCostRecordById(int id)
    {
        var result = await _historyService.GetCostRecordByIdAsync(id);
        
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bản ghi chi phí theo xe
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <returns>Danh sách chi phí</returns>
    [HttpGet("cost/vehicle/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<List<CostRecordDto>>>> GetCostRecordsByVehicleId(int vehicleId)
    {
        var result = await _historyService.GetCostRecordsByVehicleIdAsync(vehicleId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bản ghi chi phí theo chủ sở hữu
    /// </summary>
    /// <param name="coOwnerId">ID chủ sở hữu</param>
    /// <returns>Danh sách chi phí</returns>
    [HttpGet("cost/co-owner/{coOwnerId}")]
    public async Task<ActionResult<ApiResponse<List<CostRecordDto>>>> GetCostRecordsByCoOwnerId(int coOwnerId)
    {
        var result = await _historyService.GetCostRecordsByCoOwnerIdAsync(coOwnerId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách bản ghi chi phí theo khoảng thời gian
    /// </summary>
    /// <param name="startDate">Ngày bắt đầu</param>
    /// <param name="endDate">Ngày kết thúc</param>
    /// <returns>Danh sách chi phí</returns>
    [HttpGet("cost/date-range")]
    public async Task<ActionResult<ApiResponse<List<CostRecordDto>>>> GetCostRecordsByDateRange(
        [FromQuery] DateTime startDate, 
        [FromQuery] DateTime endDate)
    {
        var result = await _historyService.GetCostRecordsByDateRangeAsync(startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xóa bản ghi chi phí
    /// </summary>
    /// <param name="id">ID bản ghi chi phí</param>
    /// <returns>Kết quả xóa</returns>
    [HttpDelete("cost/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteCostRecord(int id)
    {
        var result = await _historyService.DeleteCostRecordAsync(id);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    #endregion
}
