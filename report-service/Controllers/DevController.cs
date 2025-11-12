using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReportService.Models;
using ReportService.Repositories;
using ReportService.Services;

namespace ReportService.Controllers;

[ApiController]
[Route("api/dev")]
[AllowAnonymous]
public class DevController : ControllerBase
{
    private const int DevVehicleId = 101;
    private const int DevCoOwnerId = 501;
    private const int DevCoOwner2Id = 502;

    private readonly IWebHostEnvironment _env;
    private readonly IHistoryRepository _historyRepository;
    private readonly IAnalyticsService _analyticsService;

    public DevController(
        IWebHostEnvironment env,
        IHistoryRepository historyRepository,
        IAnalyticsService analyticsService)
    {
        _env = env;
        _historyRepository = historyRepository;
        _analyticsService = analyticsService;
    }

    [HttpGet("seed")]
    public async Task<ActionResult<object>> Seed()
    {
        if (!_env.IsDevelopment()) return Forbid();
        await EnsureDevDataAsync();

        var usageCount = (await _historyRepository.GetUsageHistoriesByVehicleIdAsync(DevVehicleId)).Count;
        var costCount = (await _historyRepository.GetCostRecordsByVehicleIdAsync(DevVehicleId)).Count;
        var maintenanceCount = (await _historyRepository.GetMaintenanceRecordsByVehicleIdAsync(DevVehicleId)).Count;

        return Ok(new
        {
            vehicleId = DevVehicleId,
            usageEntries = usageCount,
            costEntries = costCount,
            maintenanceEntries = maintenanceCount
        });
    }

    [HttpGet("usage-stats")]
    public async Task<ActionResult<object>> GetUsageStats()
    {
        if (!_env.IsDevelopment()) return Forbid();
        await EnsureDevDataAsync();
        var stats = await _analyticsService.GetUsageStatisticsAsync(DevVehicleId, DateTime.UtcNow.AddDays(-14), DateTime.UtcNow);
        return Ok(stats);
    }

    [HttpGet("cost-stats")]
    public async Task<ActionResult<object>> GetCostStats()
    {
        if (!_env.IsDevelopment()) return Forbid();
        await EnsureDevDataAsync();
        var stats = await _analyticsService.GetCostStatisticsAsync(DevVehicleId, DateTime.UtcNow.AddDays(-14), DateTime.UtcNow);
        return Ok(stats);
    }

    [HttpPost("reports/usage")]
    public async Task<ActionResult<object>> GenerateUsageReport([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        if (!_env.IsDevelopment()) return Forbid();
        await EnsureDevDataAsync();

        var start = startDate ?? DateTime.UtcNow.AddDays(-7);
        var end = endDate ?? DateTime.UtcNow;
        var report = await _analyticsService.GenerateUsageReportAsync(DevVehicleId, start, end);
        return Ok(report);
    }

    private async Task EnsureDevDataAsync()
    {
        var existingUsages = await _historyRepository.GetUsageHistoriesByVehicleIdAsync(DevVehicleId);
        if (!existingUsages.Any())
        {
            var baseDate = DateTime.UtcNow.AddDays(-10);
            for (int i = 0; i < 5; i++)
            {
                var start = baseDate.AddDays(i).AddHours(8);
                var end = start.AddHours(2);
                await _historyRepository.CreateUsageHistoryAsync(new UsageHistory
                {
                    VehicleId = DevVehicleId,
                    CoOwnerId = i % 2 == 0 ? DevCoOwnerId : DevCoOwner2Id,
                    StartTime = start,
                    EndTime = end,
                    StartLocation = "District " + (i + 1),
                    EndLocation = "District " + (i + 2),
                    DistanceKm = 35 + i * 5,
                    StartBatteryLevel = 80 - i * 5,
                    EndBatteryLevel = 40 - i * 4,
                    EnergyConsumed = 12 + i,
                    Cost = 150000 + i * 20000,
                    Purpose = i % 2 == 0 ? "Commute" : "Delivery",
                    Notes = "Dev usage entry " + (i + 1)
                });
            }
        }

        var existingCosts = await _historyRepository.GetCostRecordsByVehicleIdAsync(DevVehicleId);
        if (!existingCosts.Any())
        {
            var baseDate = DateTime.UtcNow.AddDays(-12);
            var costTypes = new[] { "Maintenance", "Charging", "Cleaning" };
            for (int i = 0; i < costTypes.Length; i++)
            {
                await _historyRepository.CreateCostRecordAsync(new CostRecord
                {
                    VehicleId = DevVehicleId,
                    CoOwnerId = DevCoOwnerId,
                    CostType = costTypes[i],
                    Description = $"Dev {costTypes[i]} cost",
                    Amount = 80000 + i * 50000,
                    ExpenseDate = baseDate.AddDays(i * 3),
                    PaymentStatus = PaymentStatus.Paid,
                    Notes = "Dev cost entry"
                });
            }
        }

        var existingMaintenance = await _historyRepository.GetMaintenanceRecordsByVehicleIdAsync(DevVehicleId);
        if (!existingMaintenance.Any())
        {
            await _historyRepository.CreateMaintenanceRecordAsync(new MaintenanceRecord
            {
                VehicleId = DevVehicleId,
                MaintenanceType = "Battery Check",
                Description = "Routine battery inspection",
                ServiceProvider = "EV Service Center",
                Cost = 200000m,
                MileageAtService = 15000,
                ServiceDate = DateTime.UtcNow.AddDays(-20),
                NextServiceDue = DateTime.UtcNow.AddMonths(6),
                Notes = "Battery healthy",
                Status = MaintenanceStatus.Completed
            });
        }
    }
}


