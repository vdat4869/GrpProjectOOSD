using HistoryAnalyticsService.Models;

namespace HistoryAnalyticsService.DTOs;

/// <summary>
/// DTO cho yêu cầu tạo lịch sử sử dụng
/// </summary>
public class CreateUsageHistoryRequest
{
    /// <summary>
    /// ID xe
    /// </summary>
    public int VehicleId { get; set; }
    
    /// <summary>
    /// ID chủ sở hữu sử dụng
    /// </summary>
    public int CoOwnerId { get; set; }
    
    /// <summary>
    /// Thời gian bắt đầu sử dụng
    /// </summary>
    public DateTime StartTime { get; set; }
    
    /// <summary>
    /// Thời gian kết thúc sử dụng
    /// </summary>
    public DateTime EndTime { get; set; }
    
    /// <summary>
    /// Địa điểm bắt đầu
    /// </summary>
    public string? StartLocation { get; set; }
    
    /// <summary>
    /// Địa điểm kết thúc
    /// </summary>
    public string? EndLocation { get; set; }
    
    /// <summary>
    /// Quãng đường đi được (km)
    /// </summary>
    public decimal DistanceKm { get; set; }
    
    /// <summary>
    /// Mức pin bắt đầu (%)
    /// </summary>
    public decimal StartBatteryLevel { get; set; }
    
    /// <summary>
    /// Mức pin kết thúc (%)
    /// </summary>
    public decimal EndBatteryLevel { get; set; }
    
    /// <summary>
    /// Năng lượng tiêu thụ (kWh)
    /// </summary>
    public decimal EnergyConsumed { get; set; }
    
    /// <summary>
    /// Chi phí sử dụng
    /// </summary>
    public decimal Cost { get; set; }
    
    /// <summary>
    /// Mục đích sử dụng
    /// </summary>
    public string? Purpose { get; set; }
    
    /// <summary>
    /// Ghi chú
    /// </summary>
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho thông tin lịch sử sử dụng
/// </summary>
public class UsageHistoryDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public int CoOwnerId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? StartLocation { get; set; }
    public string? EndLocation { get; set; }
    public decimal DistanceKm { get; set; }
    public decimal StartBatteryLevel { get; set; }
    public decimal EndBatteryLevel { get; set; }
    public decimal EnergyConsumed { get; set; }
    public decimal Cost { get; set; }
    public string? Purpose { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho yêu cầu tạo phiên sạc
/// </summary>
public class CreateChargingSessionRequest
{
    /// <summary>
    /// ID xe
    /// </summary>
    public int VehicleId { get; set; }
    
    /// <summary>
    /// ID chủ sở hữu sạc
    /// </summary>
    public int CoOwnerId { get; set; }
    
    /// <summary>
    /// ID trạm sạc
    /// </summary>
    public string? ChargingStationId { get; set; }
    
    /// <summary>
    /// Thời gian bắt đầu sạc
    /// </summary>
    public DateTime StartTime { get; set; }
    
    /// <summary>
    /// Thời gian kết thúc sạc
    /// </summary>
    public DateTime EndTime { get; set; }
    
    /// <summary>
    /// Mức pin bắt đầu (%)
    /// </summary>
    public decimal StartBatteryLevel { get; set; }
    
    /// <summary>
    /// Mức pin kết thúc (%)
    /// </summary>
    public decimal EndBatteryLevel { get; set; }
    
    /// <summary>
    /// Năng lượng sạc (kWh)
    /// </summary>
    public decimal EnergyConsumed { get; set; }
    
    /// <summary>
    /// Chi phí sạc
    /// </summary>
    public decimal Cost { get; set; }
    
    /// <summary>
    /// Loại sạc (AC/DC)
    /// </summary>
    public string? ChargingType { get; set; }
    
    /// <summary>
    /// Công suất sạc (kW)
    /// </summary>
    public decimal? ChargingPower { get; set; }
    
    /// <summary>
    /// Địa điểm sạc
    /// </summary>
    public string? Location { get; set; }
}

/// <summary>
/// DTO cho thông tin phiên sạc
/// </summary>
public class ChargingSessionDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public int CoOwnerId { get; set; }
    public string? ChargingStationId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public decimal StartBatteryLevel { get; set; }
    public decimal EndBatteryLevel { get; set; }
    public decimal EnergyConsumed { get; set; }
    public decimal Cost { get; set; }
    public string? ChargingType { get; set; }
    public decimal? ChargingPower { get; set; }
    public string? Location { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho yêu cầu tạo bản ghi bảo dưỡng
/// </summary>
public class CreateMaintenanceRecordRequest
{
    /// <summary>
    /// ID xe
    /// </summary>
    public int VehicleId { get; set; }
    
    /// <summary>
    /// Loại bảo dưỡng
    /// </summary>
    public string MaintenanceType { get; set; } = string.Empty;
    
    /// <summary>
    /// Mô tả chi tiết
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Nhà cung cấp dịch vụ
    /// </summary>
    public string? ServiceProvider { get; set; }
    
    /// <summary>
    /// Chi phí bảo dưỡng
    /// </summary>
    public decimal Cost { get; set; }
    
    /// <summary>
    /// Số km tại thời điểm bảo dưỡng
    /// </summary>
    public decimal MileageAtService { get; set; }
    
    /// <summary>
    /// Ngày bảo dưỡng
    /// </summary>
    public DateTime ServiceDate { get; set; }
    
    /// <summary>
    /// Ngày bảo dưỡng tiếp theo
    /// </summary>
    public DateTime NextServiceDue { get; set; }
    
    /// <summary>
    /// Ghi chú
    /// </summary>
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho thông tin bản ghi bảo dưỡng
/// </summary>
public class MaintenanceRecordDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string MaintenanceType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ServiceProvider { get; set; }
    public decimal Cost { get; set; }
    public decimal MileageAtService { get; set; }
    public DateTime ServiceDate { get; set; }
    public DateTime NextServiceDue { get; set; }
    public MaintenanceStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho yêu cầu tạo bản ghi chi phí
/// </summary>
public class CreateCostRecordRequest
{
    /// <summary>
    /// ID xe
    /// </summary>
    public int VehicleId { get; set; }
    
    /// <summary>
    /// ID chủ sở hữu chịu chi phí
    /// </summary>
    public int CoOwnerId { get; set; }
    
    /// <summary>
    /// Loại chi phí
    /// </summary>
    public string CostType { get; set; } = string.Empty;
    
    /// <summary>
    /// Mô tả chi phí
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Số tiền
    /// </summary>
    public decimal Amount { get; set; }
    
    /// <summary>
    /// Đơn vị tiền tệ
    /// </summary>
    public string Currency { get; set; } = "VND";
    
    /// <summary>
    /// Ngày phát sinh chi phí
    /// </summary>
    public DateTime ExpenseDate { get; set; }
    
    /// <summary>
    /// Ghi chú
    /// </summary>
    public string? Notes { get; set; }
}

/// <summary>
/// DTO cho thông tin bản ghi chi phí
/// </summary>
public class CostRecordDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public int CoOwnerId { get; set; }
    public string CostType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public DateTime ExpenseDate { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho báo cáo phân tích
/// </summary>
public class AnalyticsReportDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string ReportType { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string ReportData { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// DTO cho thống kê sử dụng xe
/// </summary>
public class UsageStatisticsDto
{
    /// <summary>
    /// Tổng số lần sử dụng
    /// </summary>
    public int TotalUsageCount { get; set; }
    
    /// <summary>
    /// Tổng quãng đường (km)
    /// </summary>
    public decimal TotalDistance { get; set; }
    
    /// <summary>
    /// Tổng năng lượng tiêu thụ (kWh)
    /// </summary>
    public decimal TotalEnergyConsumed { get; set; }
    
    /// <summary>
    /// Tổng chi phí sử dụng
    /// </summary>
    public decimal TotalCost { get; set; }
    
    /// <summary>
    /// Thời gian sử dụng trung bình (phút)
    /// </summary>
    public decimal AverageUsageTime { get; set; }
    
    /// <summary>
    /// Quãng đường trung bình mỗi lần sử dụng (km)
    /// </summary>
    public decimal AverageDistancePerUsage { get; set; }
    
    /// <summary>
    /// Hiệu suất năng lượng (km/kWh)
    /// </summary>
    public decimal EnergyEfficiency { get; set; }
}

/// <summary>
/// DTO cho thống kê chi phí
/// </summary>
public class CostStatisticsDto
{
    /// <summary>
    /// Tổng chi phí theo loại
    /// </summary>
    public Dictionary<string, decimal> CostByType { get; set; } = new Dictionary<string, decimal>();
    
    /// <summary>
    /// Tổng chi phí theo chủ sở hữu
    /// </summary>
    public Dictionary<int, decimal> CostByCoOwner { get; set; } = new Dictionary<int, decimal>();
    
    /// <summary>
    /// Chi phí trung bình mỗi tháng
    /// </summary>
    public decimal AverageMonthlyCost { get; set; }
    
    /// <summary>
    /// Chi phí trung bình mỗi km
    /// </summary>
    public decimal AverageCostPerKm { get; set; }
}

/// <summary>
/// DTO cho phản hồi chung của API
/// </summary>
public class ApiResponse<T>
{
    /// <summary>
    /// Trạng thái thành công hay không
    /// </summary>
    public bool Success { get; set; }
    
    /// <summary>
    /// Thông báo
    /// </summary>
    public string Message { get; set; } = string.Empty;
    
    /// <summary>
    /// Dữ liệu trả về
    /// </summary>
    public T? Data { get; set; }
    
    /// <summary>
    /// Danh sách lỗi (nếu có)
    /// </summary>
    public List<string> Errors { get; set; } = new List<string>();
}
