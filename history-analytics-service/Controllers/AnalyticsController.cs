using Microsoft.AspNetCore.Mvc;
using HistoryAnalyticsService.DTOs;
using HistoryAnalyticsService.Services;
using Microsoft.AspNetCore.Authorization;

namespace HistoryAnalyticsService.Controllers;

/// <summary>
/// Controller xử lý phân tích và báo cáo dữ liệu
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    /// <summary>
    /// Lấy thống kê sử dụng xe
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <param name="startDate">Ngày bắt đầu (tùy chọn)</param>
    /// <param name="endDate">Ngày kết thúc (tùy chọn)</param>
    /// <returns>Thống kê sử dụng</returns>
    [HttpGet("usage-statistics/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<UsageStatisticsDto>>> GetUsageStatistics(
        int vehicleId, 
        [FromQuery] DateTime? startDate = null, 
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _analyticsService.GetUsageStatisticsAsync(vehicleId, startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy thống kê chi phí
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <param name="startDate">Ngày bắt đầu (tùy chọn)</param>
    /// <param name="endDate">Ngày kết thúc (tùy chọn)</param>
    /// <returns>Thống kê chi phí</returns>
    [HttpGet("cost-statistics/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<CostStatisticsDto>>> GetCostStatistics(
        int vehicleId, 
        [FromQuery] DateTime? startDate = null, 
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _analyticsService.GetCostStatisticsAsync(vehicleId, startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tạo báo cáo sử dụng xe
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <param name="startDate">Ngày bắt đầu</param>
    /// <param name="endDate">Ngày kết thúc</param>
    /// <returns>Báo cáo sử dụng</returns>
    [HttpPost("reports/usage/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<AnalyticsReportDto>>> GenerateUsageReport(
        int vehicleId, 
        [FromQuery] DateTime startDate, 
        [FromQuery] DateTime endDate)
    {
        var result = await _analyticsService.GenerateUsageReportAsync(vehicleId, startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tạo báo cáo chi phí
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <param name="startDate">Ngày bắt đầu</param>
    /// <param name="endDate">Ngày kết thúc</param>
    /// <returns>Báo cáo chi phí</returns>
    [HttpPost("reports/cost/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<AnalyticsReportDto>>> GenerateCostReport(
        int vehicleId, 
        [FromQuery] DateTime startDate, 
        [FromQuery] DateTime endDate)
    {
        var result = await _analyticsService.GenerateCostReportAsync(vehicleId, startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tạo báo cáo bảo dưỡng
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <param name="startDate">Ngày bắt đầu</param>
    /// <param name="endDate">Ngày kết thúc</param>
    /// <returns>Báo cáo bảo dưỡng</returns>
    [HttpPost("reports/maintenance/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<AnalyticsReportDto>>> GenerateMaintenanceReport(
        int vehicleId, 
        [FromQuery] DateTime startDate, 
        [FromQuery] DateTime endDate)
    {
        var result = await _analyticsService.GenerateMaintenanceReportAsync(vehicleId, startDate, endDate);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách báo cáo theo xe
    /// </summary>
    /// <param name="vehicleId">ID xe</param>
    /// <returns>Danh sách báo cáo</returns>
    [HttpGet("reports/vehicle/{vehicleId}")]
    public async Task<ActionResult<ApiResponse<List<AnalyticsReportDto>>>> GetAnalyticsReportsByVehicleId(int vehicleId)
    {
        var result = await _analyticsService.GetAnalyticsReportsByVehicleIdAsync(vehicleId);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách báo cáo theo loại
    /// </summary>
    /// <param name="reportType">Loại báo cáo</param>
    /// <returns>Danh sách báo cáo</returns>
    [HttpGet("reports/type/{reportType}")]
    public async Task<ActionResult<ApiResponse<List<AnalyticsReportDto>>>> GetAnalyticsReportsByType(string reportType)
    {
        var result = await _analyticsService.GetAnalyticsReportsByTypeAsync(reportType);
        
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
