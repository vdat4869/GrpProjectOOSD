using HistoryAnalyticsService.DTOs;
using HistoryAnalyticsService.Models;
using HistoryAnalyticsService.Repositories;
using System.Text.Json;

namespace HistoryAnalyticsService.Services;

/// <summary>
/// Interface cho Analytics Service
/// </summary>
public interface IAnalyticsService
{
    Task<ApiResponse<UsageStatisticsDto>> GetUsageStatisticsAsync(int vehicleId, DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<CostStatisticsDto>> GetCostStatisticsAsync(int vehicleId, DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<AnalyticsReportDto>> GenerateUsageReportAsync(int vehicleId, DateTime startDate, DateTime endDate);
    Task<ApiResponse<AnalyticsReportDto>> GenerateCostReportAsync(int vehicleId, DateTime startDate, DateTime endDate);
    Task<ApiResponse<AnalyticsReportDto>> GenerateMaintenanceReportAsync(int vehicleId, DateTime startDate, DateTime endDate);
    Task<ApiResponse<List<AnalyticsReportDto>>> GetAnalyticsReportsByVehicleIdAsync(int vehicleId);
    Task<ApiResponse<List<AnalyticsReportDto>>> GetAnalyticsReportsByTypeAsync(string reportType);
}

/// <summary>
/// Service xử lý business logic cho Analytics
/// </summary>
public class AnalyticsService : IAnalyticsService
{
    private readonly IHistoryRepository _historyRepository;

    public AnalyticsService(IHistoryRepository historyRepository)
    {
        _historyRepository = historyRepository;
    }

    /// <summary>
    /// Lấy thống kê sử dụng xe
    /// </summary>
    public async Task<ApiResponse<UsageStatisticsDto>> GetUsageStatisticsAsync(int vehicleId, DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            // Nếu không có ngày bắt đầu/kết thúc, lấy dữ liệu 30 ngày gần nhất
            var actualStartDate = startDate ?? DateTime.UtcNow.AddDays(-30);
            var actualEndDate = endDate ?? DateTime.UtcNow;

            var usageHistories = await _historyRepository.GetUsageHistoriesByDateRangeAsync(actualStartDate, actualEndDate);
            var vehicleUsages = usageHistories.Where(u => u.VehicleId == vehicleId).ToList();

            if (!vehicleUsages.Any())
            {
                return new ApiResponse<UsageStatisticsDto>
                {
                    Success = true,
                    Message = "Không có dữ liệu sử dụng trong khoảng thời gian này",
                    Data = new UsageStatisticsDto()
                };
            }

            var statistics = new UsageStatisticsDto
            {
                TotalUsageCount = vehicleUsages.Count,
                TotalDistance = vehicleUsages.Sum(u => u.DistanceKm),
                TotalEnergyConsumed = vehicleUsages.Sum(u => u.EnergyConsumed),
                TotalCost = vehicleUsages.Sum(u => u.Cost),
                AverageUsageTime = (decimal)vehicleUsages.Average(u => (u.EndTime - u.StartTime).TotalMinutes),
                AverageDistancePerUsage = vehicleUsages.Average(u => u.DistanceKm),
                EnergyEfficiency = vehicleUsages.Sum(u => u.DistanceKm) / (vehicleUsages.Sum(u => u.EnergyConsumed) > 0 ? vehicleUsages.Sum(u => u.EnergyConsumed) : 1)
            };

            return new ApiResponse<UsageStatisticsDto>
            {
                Success = true,
                Message = "Lấy thống kê sử dụng thành công",
                Data = statistics
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<UsageStatisticsDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy thống kê sử dụng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy thống kê chi phí
    /// </summary>
    public async Task<ApiResponse<CostStatisticsDto>> GetCostStatisticsAsync(int vehicleId, DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            // Nếu không có ngày bắt đầu/kết thúc, lấy dữ liệu 30 ngày gần nhất
            var actualStartDate = startDate ?? DateTime.UtcNow.AddDays(-30);
            var actualEndDate = endDate ?? DateTime.UtcNow;

            var costRecords = await _historyRepository.GetCostRecordsByDateRangeAsync(actualStartDate, actualEndDate);
            var vehicleCosts = costRecords.Where(c => c.VehicleId == vehicleId).ToList();

            if (!vehicleCosts.Any())
            {
                return new ApiResponse<CostStatisticsDto>
                {
                    Success = true,
                    Message = "Không có dữ liệu chi phí trong khoảng thời gian này",
                    Data = new CostStatisticsDto()
                };
            }

            var statistics = new CostStatisticsDto
            {
                CostByType = vehicleCosts.GroupBy(c => c.CostType)
                    .ToDictionary(g => g.Key, g => g.Sum(c => c.Amount)),
                CostByCoOwner = vehicleCosts.GroupBy(c => c.CoOwnerId)
                    .ToDictionary(g => g.Key, g => g.Sum(c => c.Amount)),
                AverageMonthlyCost = vehicleCosts.Sum(c => c.Amount) / Math.Max(1, (actualEndDate - actualStartDate).Days / 30),
                AverageCostPerKm = 0 // Sẽ tính dựa trên tổng quãng đường từ usage history
            };

            // Tính chi phí trung bình mỗi km
            var usageHistories = await _historyRepository.GetUsageHistoriesByDateRangeAsync(actualStartDate, actualEndDate);
            var vehicleUsages = usageHistories.Where(u => u.VehicleId == vehicleId).ToList();
            var totalDistance = vehicleUsages.Sum(u => u.DistanceKm);
            
            if (totalDistance > 0)
            {
                statistics.AverageCostPerKm = vehicleCosts.Sum(c => c.Amount) / totalDistance;
            }

            return new ApiResponse<CostStatisticsDto>
            {
                Success = true,
                Message = "Lấy thống kê chi phí thành công",
                Data = statistics
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<CostStatisticsDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy thống kê chi phí",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Tạo báo cáo sử dụng xe
    /// </summary>
    public async Task<ApiResponse<AnalyticsReportDto>> GenerateUsageReportAsync(int vehicleId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var usageHistories = await _historyRepository.GetUsageHistoriesByDateRangeAsync(startDate, endDate);
            var vehicleUsages = usageHistories.Where(u => u.VehicleId == vehicleId).ToList();

            var reportData = new
            {
                VehicleId = vehicleId,
                Period = new { StartDate = startDate, EndDate = endDate },
                TotalUsageCount = vehicleUsages.Count,
                TotalDistance = vehicleUsages.Sum(u => u.DistanceKm),
                TotalEnergyConsumed = vehicleUsages.Sum(u => u.EnergyConsumed),
                TotalCost = vehicleUsages.Sum(u => u.Cost),
                AverageUsageTime = vehicleUsages.Any() ? vehicleUsages.Average(u => (u.EndTime - u.StartTime).TotalMinutes) : 0,
                AverageDistancePerUsage = vehicleUsages.Any() ? vehicleUsages.Average(u => u.DistanceKm) : 0,
                EnergyEfficiency = vehicleUsages.Sum(u => u.DistanceKm) / (vehicleUsages.Sum(u => u.EnergyConsumed) > 0 ? vehicleUsages.Sum(u => u.EnergyConsumed) : 1),
                UsageByCoOwner = vehicleUsages.GroupBy(u => u.CoOwnerId)
                    .ToDictionary(g => g.Key, g => new
                    {
                        UsageCount = g.Count(),
                        TotalDistance = g.Sum(u => u.DistanceKm),
                        TotalCost = g.Sum(u => u.Cost)
                    }),
                DailyUsage = vehicleUsages.GroupBy(u => u.StartTime.Date)
                    .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => new
                    {
                        UsageCount = g.Count(),
                        TotalDistance = g.Sum(u => u.DistanceKm),
                        TotalCost = g.Sum(u => u.Cost)
                    })
            };

            var analyticsReport = new AnalyticsReport
            {
                VehicleId = vehicleId,
                ReportType = "Usage",
                PeriodStart = startDate,
                PeriodEnd = endDate,
                ReportData = JsonSerializer.Serialize(reportData),
                GeneratedAt = DateTime.UtcNow
            };

            var createdReport = await _historyRepository.CreateAnalyticsReportAsync(analyticsReport);

            var reportDto = new AnalyticsReportDto
            {
                Id = createdReport.Id,
                VehicleId = createdReport.VehicleId,
                ReportType = createdReport.ReportType,
                PeriodStart = createdReport.PeriodStart,
                PeriodEnd = createdReport.PeriodEnd,
                ReportData = createdReport.ReportData,
                GeneratedAt = createdReport.GeneratedAt,
                CreatedAt = createdReport.CreatedAt,
                IsActive = createdReport.IsActive
            };

            return new ApiResponse<AnalyticsReportDto>
            {
                Success = true,
                Message = "Tạo báo cáo sử dụng thành công",
                Data = reportDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AnalyticsReportDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi tạo báo cáo sử dụng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Tạo báo cáo chi phí
    /// </summary>
    public async Task<ApiResponse<AnalyticsReportDto>> GenerateCostReportAsync(int vehicleId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var costRecords = await _historyRepository.GetCostRecordsByDateRangeAsync(startDate, endDate);
            var vehicleCosts = costRecords.Where(c => c.VehicleId == vehicleId).ToList();

            var reportData = new
            {
                VehicleId = vehicleId,
                Period = new { StartDate = startDate, EndDate = endDate },
                TotalCost = vehicleCosts.Sum(c => c.Amount),
                CostByType = vehicleCosts.GroupBy(c => c.CostType)
                    .ToDictionary(g => g.Key, g => g.Sum(c => c.Amount)),
                CostByCoOwner = vehicleCosts.GroupBy(c => c.CoOwnerId)
                    .ToDictionary(g => g.Key, g => g.Sum(c => c.Amount)),
                AverageMonthlyCost = vehicleCosts.Sum(c => c.Amount) / Math.Max(1, (endDate - startDate).Days / 30),
                MonthlyCostBreakdown = vehicleCosts.GroupBy(c => new { c.ExpenseDate.Year, c.ExpenseDate.Month })
                    .ToDictionary(g => $"{g.Key.Year}-{g.Key.Month:D2}", g => g.Sum(c => c.Amount))
            };

            var analyticsReport = new AnalyticsReport
            {
                VehicleId = vehicleId,
                ReportType = "Cost",
                PeriodStart = startDate,
                PeriodEnd = endDate,
                ReportData = JsonSerializer.Serialize(reportData),
                GeneratedAt = DateTime.UtcNow
            };

            var createdReport = await _historyRepository.CreateAnalyticsReportAsync(analyticsReport);

            var reportDto = new AnalyticsReportDto
            {
                Id = createdReport.Id,
                VehicleId = createdReport.VehicleId,
                ReportType = createdReport.ReportType,
                PeriodStart = createdReport.PeriodStart,
                PeriodEnd = createdReport.PeriodEnd,
                ReportData = createdReport.ReportData,
                GeneratedAt = createdReport.GeneratedAt,
                CreatedAt = createdReport.CreatedAt,
                IsActive = createdReport.IsActive
            };

            return new ApiResponse<AnalyticsReportDto>
            {
                Success = true,
                Message = "Tạo báo cáo chi phí thành công",
                Data = reportDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AnalyticsReportDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi tạo báo cáo chi phí",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Tạo báo cáo bảo dưỡng
    /// </summary>
    public async Task<ApiResponse<AnalyticsReportDto>> GenerateMaintenanceReportAsync(int vehicleId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var maintenanceRecords = await _historyRepository.GetMaintenanceRecordsByDateRangeAsync(startDate, endDate);
            var vehicleMaintenances = maintenanceRecords.Where(m => m.VehicleId == vehicleId).ToList();

            var reportData = new
            {
                VehicleId = vehicleId,
                Period = new { StartDate = startDate, EndDate = endDate },
                TotalMaintenanceCount = vehicleMaintenances.Count,
                TotalMaintenanceCost = vehicleMaintenances.Sum(m => m.Cost),
                MaintenanceByType = vehicleMaintenances.GroupBy(m => m.MaintenanceType)
                    .ToDictionary(g => g.Key, g => new
                    {
                        Count = g.Count(),
                        TotalCost = g.Sum(m => m.Cost),
                        AverageCost = g.Average(m => m.Cost)
                    }),
                MaintenanceByProvider = vehicleMaintenances.GroupBy(m => m.ServiceProvider)
                    .ToDictionary(g => g.Key ?? "Unknown", g => new
                    {
                        Count = g.Count(),
                        TotalCost = g.Sum(m => m.Cost)
                    }),
                UpcomingMaintenance = vehicleMaintenances.Where(m => m.NextServiceDue > DateTime.UtcNow)
                    .OrderBy(m => m.NextServiceDue)
                    .Select(m => new
                    {
                        MaintenanceType = m.MaintenanceType,
                        NextServiceDue = m.NextServiceDue,
                        MileageAtLastService = m.MileageAtService
                    })
            };

            var analyticsReport = new AnalyticsReport
            {
                VehicleId = vehicleId,
                ReportType = "Maintenance",
                PeriodStart = startDate,
                PeriodEnd = endDate,
                ReportData = JsonSerializer.Serialize(reportData),
                GeneratedAt = DateTime.UtcNow
            };

            var createdReport = await _historyRepository.CreateAnalyticsReportAsync(analyticsReport);

            var reportDto = new AnalyticsReportDto
            {
                Id = createdReport.Id,
                VehicleId = createdReport.VehicleId,
                ReportType = createdReport.ReportType,
                PeriodStart = createdReport.PeriodStart,
                PeriodEnd = createdReport.PeriodEnd,
                ReportData = createdReport.ReportData,
                GeneratedAt = createdReport.GeneratedAt,
                CreatedAt = createdReport.CreatedAt,
                IsActive = createdReport.IsActive
            };

            return new ApiResponse<AnalyticsReportDto>
            {
                Success = true,
                Message = "Tạo báo cáo bảo dưỡng thành công",
                Data = reportDto
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AnalyticsReportDto>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi tạo báo cáo bảo dưỡng",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách báo cáo theo xe
    /// </summary>
    public async Task<ApiResponse<List<AnalyticsReportDto>>> GetAnalyticsReportsByVehicleIdAsync(int vehicleId)
    {
        try
        {
            var reports = await _historyRepository.GetAnalyticsReportsByVehicleIdAsync(vehicleId);
            var reportDtos = reports.Select(r => new AnalyticsReportDto
            {
                Id = r.Id,
                VehicleId = r.VehicleId,
                ReportType = r.ReportType,
                PeriodStart = r.PeriodStart,
                PeriodEnd = r.PeriodEnd,
                ReportData = r.ReportData,
                GeneratedAt = r.GeneratedAt,
                CreatedAt = r.CreatedAt,
                IsActive = r.IsActive
            }).ToList();

            return new ApiResponse<List<AnalyticsReportDto>>
            {
                Success = true,
                Message = "Lấy danh sách báo cáo theo xe thành công",
                Data = reportDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<AnalyticsReportDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách báo cáo theo xe",
                Errors = new List<string> { ex.Message }
            };
        }
    }

    /// <summary>
    /// Lấy danh sách báo cáo theo loại
    /// </summary>
    public async Task<ApiResponse<List<AnalyticsReportDto>>> GetAnalyticsReportsByTypeAsync(string reportType)
    {
        try
        {
            var reports = await _historyRepository.GetAnalyticsReportsByTypeAsync(reportType);
            var reportDtos = reports.Select(r => new AnalyticsReportDto
            {
                Id = r.Id,
                VehicleId = r.VehicleId,
                ReportType = r.ReportType,
                PeriodStart = r.PeriodStart,
                PeriodEnd = r.PeriodEnd,
                ReportData = r.ReportData,
                GeneratedAt = r.GeneratedAt,
                CreatedAt = r.CreatedAt,
                IsActive = r.IsActive
            }).ToList();

            return new ApiResponse<List<AnalyticsReportDto>>
            {
                Success = true,
                Message = "Lấy danh sách báo cáo theo loại thành công",
                Data = reportDtos
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<List<AnalyticsReportDto>>
            {
                Success = false,
                Message = "Có lỗi xảy ra khi lấy danh sách báo cáo theo loại",
                Errors = new List<string> { ex.Message }
            };
        }
    }
}
