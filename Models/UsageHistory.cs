namespace HistoryAnalyticsService.Models;

/// <summary>
/// Entity UsageHistory - lịch sử sử dụng xe
/// </summary>
public class UsageHistory
{
    public int Id { get; set; }
    
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
    
    /// <summary>
    /// Ngày tạo
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Ngày cập nhật cuối
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    /// <summary>
    /// Trạng thái hoạt động
    /// </summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// Entity ChargingSession - phiên sạc pin
/// </summary>
public class ChargingSession
{
    public int Id { get; set; }
    
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
    
    /// <summary>
    /// Ngày tạo
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Ngày cập nhật cuối
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    /// <summary>
    /// Trạng thái hoạt động
    /// </summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// Entity MaintenanceRecord - bản ghi bảo dưỡng
/// </summary>
public class MaintenanceRecord
{
    public int Id { get; set; }
    
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
    /// Trạng thái bảo dưỡng
    /// </summary>
    public MaintenanceStatus Status { get; set; }
    
    /// <summary>
    /// Ghi chú
    /// </summary>
    public string? Notes { get; set; }
    
    /// <summary>
    /// Ngày tạo
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Ngày cập nhật cuối
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    /// <summary>
    /// Trạng thái hoạt động
    /// </summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// Entity CostRecord - bản ghi chi phí
/// </summary>
public class CostRecord
{
    public int Id { get; set; }
    
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
    /// Trạng thái thanh toán
    /// </summary>
    public PaymentStatus PaymentStatus { get; set; }
    
    /// <summary>
    /// Ghi chú
    /// </summary>
    public string? Notes { get; set; }
    
    /// <summary>
    /// Ngày tạo
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Ngày cập nhật cuối
    /// </summary>
    public DateTime UpdatedAt { get; set; }
    
    /// <summary>
    /// Trạng thái hoạt động
    /// </summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// Entity AnalyticsReport - báo cáo phân tích
/// </summary>
public class AnalyticsReport
{
    public int Id { get; set; }
    
    /// <summary>
    /// ID xe
    /// </summary>
    public int VehicleId { get; set; }
    
    /// <summary>
    /// Loại báo cáo
    /// </summary>
    public string ReportType { get; set; } = string.Empty;
    
    /// <summary>
    /// Thời gian bắt đầu kỳ báo cáo
    /// </summary>
    public DateTime PeriodStart { get; set; }
    
    /// <summary>
    /// Thời gian kết thúc kỳ báo cáo
    /// </summary>
    public DateTime PeriodEnd { get; set; }
    
    /// <summary>
    /// Dữ liệu báo cáo (JSON)
    /// </summary>
    public string ReportData { get; set; } = string.Empty;
    
    /// <summary>
    /// Thời gian tạo báo cáo
    /// </summary>
    public DateTime GeneratedAt { get; set; }
    
    /// <summary>
    /// Ngày tạo
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Trạng thái hoạt động
    /// </summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// Enum trạng thái bảo dưỡng
/// </summary>
public enum MaintenanceStatus
{
    Scheduled = 0,   // Đã lên lịch
    InProgress = 1, // Đang thực hiện
    Completed = 2,  // Hoàn thành
    Overdue = 3     // Quá hạn
}

/// <summary>
/// Enum trạng thái thanh toán
/// </summary>
public enum PaymentStatus
{
    Pending = 0,    // Chờ thanh toán
    Paid = 1,       // Đã thanh toán
    Overdue = 2,    // Quá hạn
    Cancelled = 3   // Đã hủy
}
