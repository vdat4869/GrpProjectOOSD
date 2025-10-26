using Microsoft.EntityFrameworkCore;
using HistoryAnalyticsService.Models;

namespace HistoryAnalyticsService.Data;

/// <summary>
/// DbContext cho History Analytics Service - quản lý lịch sử sử dụng và phân tích
/// </summary>
public class HistoryDbContext : DbContext
{
    public HistoryDbContext(DbContextOptions<HistoryDbContext> options) : base(options)
    {
    }

    // DbSet cho các entity
    public DbSet<UsageHistory> UsageHistories { get; set; }
    public DbSet<ChargingSession> ChargingSessions { get; set; }
    public DbSet<MaintenanceRecord> MaintenanceRecords { get; set; }
    public DbSet<CostRecord> CostRecords { get; set; }
    public DbSet<AnalyticsReport> AnalyticsReports { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Cấu hình UsageHistory entity
        modelBuilder.Entity<UsageHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.VehicleId).IsRequired();
            entity.Property(e => e.CoOwnerId).IsRequired();
            entity.Property(e => e.StartTime).IsRequired();
            entity.Property(e => e.EndTime).IsRequired();
            entity.Property(e => e.StartLocation).HasMaxLength(255);
            entity.Property(e => e.EndLocation).HasMaxLength(255);
            entity.Property(e => e.DistanceKm).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();

            // Indexes
            entity.HasIndex(e => e.VehicleId);
            entity.HasIndex(e => e.CoOwnerId);
            entity.HasIndex(e => e.StartTime);
            entity.HasIndex(e => e.EndTime);
        });

        // Cấu hình ChargingSession entity
        modelBuilder.Entity<ChargingSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.VehicleId).IsRequired();
            entity.Property(e => e.CoOwnerId).IsRequired();
            entity.Property(e => e.ChargingStationId).HasMaxLength(100);
            entity.Property(e => e.StartTime).IsRequired();
            entity.Property(e => e.EndTime).IsRequired();
            entity.Property(e => e.StartBatteryLevel).IsRequired();
            entity.Property(e => e.EndBatteryLevel).IsRequired();
            entity.Property(e => e.EnergyConsumed).IsRequired();
            entity.Property(e => e.Cost).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();

            // Indexes
            entity.HasIndex(e => e.VehicleId);
            entity.HasIndex(e => e.CoOwnerId);
            entity.HasIndex(e => e.StartTime);
        });

        // Cấu hình MaintenanceRecord entity
        modelBuilder.Entity<MaintenanceRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.VehicleId).IsRequired();
            entity.Property(e => e.MaintenanceType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.ServiceProvider).HasMaxLength(255);
            entity.Property(e => e.Cost).IsRequired();
            entity.Property(e => e.MileageAtService).IsRequired();
            entity.Property(e => e.ServiceDate).IsRequired();
            entity.Property(e => e.NextServiceDue).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();

            // Indexes
            entity.HasIndex(e => e.VehicleId);
            entity.HasIndex(e => e.ServiceDate);
        });

        // Cấu hình CostRecord entity
        modelBuilder.Entity<CostRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.VehicleId).IsRequired();
            entity.Property(e => e.CoOwnerId).IsRequired();
            entity.Property(e => e.CostType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Amount).IsRequired();
            entity.Property(e => e.Currency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.ExpenseDate).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();

            // Indexes
            entity.HasIndex(e => e.VehicleId);
            entity.HasIndex(e => e.CoOwnerId);
            entity.HasIndex(e => e.CostType);
            entity.HasIndex(e => e.ExpenseDate);
        });

        // Cấu hình AnalyticsReport entity
        modelBuilder.Entity<AnalyticsReport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.VehicleId).IsRequired();
            entity.Property(e => e.ReportType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.PeriodStart).IsRequired();
            entity.Property(e => e.PeriodEnd).IsRequired();
            entity.Property(e => e.ReportData).IsRequired(); // JSON data
            entity.Property(e => e.GeneratedAt).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();

            // Indexes
            entity.HasIndex(e => e.VehicleId);
            entity.HasIndex(e => e.ReportType);
            entity.HasIndex(e => e.PeriodStart);
            entity.HasIndex(e => e.PeriodEnd);
        });
    }
}
