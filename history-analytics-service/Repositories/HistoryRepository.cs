using HistoryAnalyticsService.Models;
using HistoryAnalyticsService.Data;
using Microsoft.EntityFrameworkCore;

namespace HistoryAnalyticsService.Repositories;

/// <summary>
/// Repository interface cho History operations
/// </summary>
public interface IHistoryRepository
{
    // UsageHistory operations
    Task<UsageHistory?> GetUsageHistoryByIdAsync(int id);
    Task<List<UsageHistory>> GetUsageHistoriesByVehicleIdAsync(int vehicleId);
    Task<List<UsageHistory>> GetUsageHistoriesByCoOwnerIdAsync(int coOwnerId);
    Task<List<UsageHistory>> GetUsageHistoriesByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<UsageHistory> CreateUsageHistoryAsync(UsageHistory usageHistory);
    Task<UsageHistory> UpdateUsageHistoryAsync(UsageHistory usageHistory);
    Task<bool> DeleteUsageHistoryAsync(int id);

    // ChargingSession operations
    Task<ChargingSession?> GetChargingSessionByIdAsync(int id);
    Task<List<ChargingSession>> GetChargingSessionsByVehicleIdAsync(int vehicleId);
    Task<List<ChargingSession>> GetChargingSessionsByCoOwnerIdAsync(int coOwnerId);
    Task<List<ChargingSession>> GetChargingSessionsByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<ChargingSession> CreateChargingSessionAsync(ChargingSession chargingSession);
    Task<ChargingSession> UpdateChargingSessionAsync(ChargingSession chargingSession);
    Task<bool> DeleteChargingSessionAsync(int id);

    // MaintenanceRecord operations
    Task<MaintenanceRecord?> GetMaintenanceRecordByIdAsync(int id);
    Task<List<MaintenanceRecord>> GetMaintenanceRecordsByVehicleIdAsync(int vehicleId);
    Task<List<MaintenanceRecord>> GetMaintenanceRecordsByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<MaintenanceRecord> CreateMaintenanceRecordAsync(MaintenanceRecord maintenanceRecord);
    Task<MaintenanceRecord> UpdateMaintenanceRecordAsync(MaintenanceRecord maintenanceRecord);
    Task<bool> DeleteMaintenanceRecordAsync(int id);

    // CostRecord operations
    Task<CostRecord?> GetCostRecordByIdAsync(int id);
    Task<List<CostRecord>> GetCostRecordsByVehicleIdAsync(int vehicleId);
    Task<List<CostRecord>> GetCostRecordsByCoOwnerIdAsync(int coOwnerId);
    Task<List<CostRecord>> GetCostRecordsByDateRangeAsync(DateTime startDate, DateTime endDate);
    Task<CostRecord> CreateCostRecordAsync(CostRecord costRecord);
    Task<CostRecord> UpdateCostRecordAsync(CostRecord costRecord);
    Task<bool> DeleteCostRecordAsync(int id);

    // AnalyticsReport operations
    Task<AnalyticsReport?> GetAnalyticsReportByIdAsync(int id);
    Task<List<AnalyticsReport>> GetAnalyticsReportsByVehicleIdAsync(int vehicleId);
    Task<List<AnalyticsReport>> GetAnalyticsReportsByTypeAsync(string reportType);
    Task<AnalyticsReport> CreateAnalyticsReportAsync(AnalyticsReport analyticsReport);
    Task<bool> DeleteAnalyticsReportAsync(int id);
}

/// <summary>
/// Repository implementation cho History operations
/// </summary>
public class HistoryRepository : IHistoryRepository
{
    private readonly HistoryDbContext _context;

    public HistoryRepository(HistoryDbContext context)
    {
        _context = context;
    }

    #region UsageHistory Operations

    public async Task<UsageHistory?> GetUsageHistoryByIdAsync(int id)
    {
        return await _context.UsageHistories
            .FirstOrDefaultAsync(u => u.Id == id && u.IsActive);
    }

    public async Task<List<UsageHistory>> GetUsageHistoriesByVehicleIdAsync(int vehicleId)
    {
        return await _context.UsageHistories
            .Where(u => u.VehicleId == vehicleId && u.IsActive)
            .OrderByDescending(u => u.StartTime)
            .ToListAsync();
    }

    public async Task<List<UsageHistory>> GetUsageHistoriesByCoOwnerIdAsync(int coOwnerId)
    {
        return await _context.UsageHistories
            .Where(u => u.CoOwnerId == coOwnerId && u.IsActive)
            .OrderByDescending(u => u.StartTime)
            .ToListAsync();
    }

    public async Task<List<UsageHistory>> GetUsageHistoriesByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _context.UsageHistories
            .Where(u => u.StartTime >= startDate && u.EndTime <= endDate && u.IsActive)
            .OrderByDescending(u => u.StartTime)
            .ToListAsync();
    }

    public async Task<UsageHistory> CreateUsageHistoryAsync(UsageHistory usageHistory)
    {
        usageHistory.CreatedAt = DateTime.UtcNow;
        usageHistory.UpdatedAt = DateTime.UtcNow;
        usageHistory.IsActive = true;

        _context.UsageHistories.Add(usageHistory);
        await _context.SaveChangesAsync();
        return usageHistory;
    }

    public async Task<UsageHistory> UpdateUsageHistoryAsync(UsageHistory usageHistory)
    {
        usageHistory.UpdatedAt = DateTime.UtcNow;
        _context.UsageHistories.Update(usageHistory);
        await _context.SaveChangesAsync();
        return usageHistory;
    }

    public async Task<bool> DeleteUsageHistoryAsync(int id)
    {
        var usageHistory = await _context.UsageHistories.FindAsync(id);
        if (usageHistory == null) return false;

        usageHistory.IsActive = false;
        usageHistory.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region ChargingSession Operations

    public async Task<ChargingSession?> GetChargingSessionByIdAsync(int id)
    {
        return await _context.ChargingSessions
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
    }

    public async Task<List<ChargingSession>> GetChargingSessionsByVehicleIdAsync(int vehicleId)
    {
        return await _context.ChargingSessions
            .Where(c => c.VehicleId == vehicleId && c.IsActive)
            .OrderByDescending(c => c.StartTime)
            .ToListAsync();
    }

    public async Task<List<ChargingSession>> GetChargingSessionsByCoOwnerIdAsync(int coOwnerId)
    {
        return await _context.ChargingSessions
            .Where(c => c.CoOwnerId == coOwnerId && c.IsActive)
            .OrderByDescending(c => c.StartTime)
            .ToListAsync();
    }

    public async Task<List<ChargingSession>> GetChargingSessionsByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _context.ChargingSessions
            .Where(c => c.StartTime >= startDate && c.EndTime <= endDate && c.IsActive)
            .OrderByDescending(c => c.StartTime)
            .ToListAsync();
    }

    public async Task<ChargingSession> CreateChargingSessionAsync(ChargingSession chargingSession)
    {
        chargingSession.CreatedAt = DateTime.UtcNow;
        chargingSession.UpdatedAt = DateTime.UtcNow;
        chargingSession.IsActive = true;

        _context.ChargingSessions.Add(chargingSession);
        await _context.SaveChangesAsync();
        return chargingSession;
    }

    public async Task<ChargingSession> UpdateChargingSessionAsync(ChargingSession chargingSession)
    {
        chargingSession.UpdatedAt = DateTime.UtcNow;
        _context.ChargingSessions.Update(chargingSession);
        await _context.SaveChangesAsync();
        return chargingSession;
    }

    public async Task<bool> DeleteChargingSessionAsync(int id)
    {
        var chargingSession = await _context.ChargingSessions.FindAsync(id);
        if (chargingSession == null) return false;

        chargingSession.IsActive = false;
        chargingSession.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region MaintenanceRecord Operations

    public async Task<MaintenanceRecord?> GetMaintenanceRecordByIdAsync(int id)
    {
        return await _context.MaintenanceRecords
            .FirstOrDefaultAsync(m => m.Id == id && m.IsActive);
    }

    public async Task<List<MaintenanceRecord>> GetMaintenanceRecordsByVehicleIdAsync(int vehicleId)
    {
        return await _context.MaintenanceRecords
            .Where(m => m.VehicleId == vehicleId && m.IsActive)
            .OrderByDescending(m => m.ServiceDate)
            .ToListAsync();
    }

    public async Task<List<MaintenanceRecord>> GetMaintenanceRecordsByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _context.MaintenanceRecords
            .Where(m => m.ServiceDate >= startDate && m.ServiceDate <= endDate && m.IsActive)
            .OrderByDescending(m => m.ServiceDate)
            .ToListAsync();
    }

    public async Task<MaintenanceRecord> CreateMaintenanceRecordAsync(MaintenanceRecord maintenanceRecord)
    {
        maintenanceRecord.CreatedAt = DateTime.UtcNow;
        maintenanceRecord.UpdatedAt = DateTime.UtcNow;
        maintenanceRecord.IsActive = true;

        _context.MaintenanceRecords.Add(maintenanceRecord);
        await _context.SaveChangesAsync();
        return maintenanceRecord;
    }

    public async Task<MaintenanceRecord> UpdateMaintenanceRecordAsync(MaintenanceRecord maintenanceRecord)
    {
        maintenanceRecord.UpdatedAt = DateTime.UtcNow;
        _context.MaintenanceRecords.Update(maintenanceRecord);
        await _context.SaveChangesAsync();
        return maintenanceRecord;
    }

    public async Task<bool> DeleteMaintenanceRecordAsync(int id)
    {
        var maintenanceRecord = await _context.MaintenanceRecords.FindAsync(id);
        if (maintenanceRecord == null) return false;

        maintenanceRecord.IsActive = false;
        maintenanceRecord.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region CostRecord Operations

    public async Task<CostRecord?> GetCostRecordByIdAsync(int id)
    {
        return await _context.CostRecords
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
    }

    public async Task<List<CostRecord>> GetCostRecordsByVehicleIdAsync(int vehicleId)
    {
        return await _context.CostRecords
            .Where(c => c.VehicleId == vehicleId && c.IsActive)
            .OrderByDescending(c => c.ExpenseDate)
            .ToListAsync();
    }

    public async Task<List<CostRecord>> GetCostRecordsByCoOwnerIdAsync(int coOwnerId)
    {
        return await _context.CostRecords
            .Where(c => c.CoOwnerId == coOwnerId && c.IsActive)
            .OrderByDescending(c => c.ExpenseDate)
            .ToListAsync();
    }

    public async Task<List<CostRecord>> GetCostRecordsByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        return await _context.CostRecords
            .Where(c => c.ExpenseDate >= startDate && c.ExpenseDate <= endDate && c.IsActive)
            .OrderByDescending(c => c.ExpenseDate)
            .ToListAsync();
    }

    public async Task<CostRecord> CreateCostRecordAsync(CostRecord costRecord)
    {
        costRecord.CreatedAt = DateTime.UtcNow;
        costRecord.UpdatedAt = DateTime.UtcNow;
        costRecord.IsActive = true;

        _context.CostRecords.Add(costRecord);
        await _context.SaveChangesAsync();
        return costRecord;
    }

    public async Task<CostRecord> UpdateCostRecordAsync(CostRecord costRecord)
    {
        costRecord.UpdatedAt = DateTime.UtcNow;
        _context.CostRecords.Update(costRecord);
        await _context.SaveChangesAsync();
        return costRecord;
    }

    public async Task<bool> DeleteCostRecordAsync(int id)
    {
        var costRecord = await _context.CostRecords.FindAsync(id);
        if (costRecord == null) return false;

        costRecord.IsActive = false;
        costRecord.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region AnalyticsReport Operations

    public async Task<AnalyticsReport?> GetAnalyticsReportByIdAsync(int id)
    {
        return await _context.AnalyticsReports
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);
    }

    public async Task<List<AnalyticsReport>> GetAnalyticsReportsByVehicleIdAsync(int vehicleId)
    {
        return await _context.AnalyticsReports
            .Where(a => a.VehicleId == vehicleId && a.IsActive)
            .OrderByDescending(a => a.GeneratedAt)
            .ToListAsync();
    }

    public async Task<List<AnalyticsReport>> GetAnalyticsReportsByTypeAsync(string reportType)
    {
        return await _context.AnalyticsReports
            .Where(a => a.ReportType == reportType && a.IsActive)
            .OrderByDescending(a => a.GeneratedAt)
            .ToListAsync();
    }

    public async Task<AnalyticsReport> CreateAnalyticsReportAsync(AnalyticsReport analyticsReport)
    {
        analyticsReport.CreatedAt = DateTime.UtcNow;
        analyticsReport.IsActive = true;

        _context.AnalyticsReports.Add(analyticsReport);
        await _context.SaveChangesAsync();
        return analyticsReport;
    }

    public async Task<bool> DeleteAnalyticsReportAsync(int id)
    {
        var analyticsReport = await _context.AnalyticsReports.FindAsync(id);
        if (analyticsReport == null) return false;

        analyticsReport.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion
}
