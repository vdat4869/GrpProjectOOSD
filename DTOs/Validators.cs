using FluentValidation;

namespace HistoryAnalyticsService.DTOs;

/// <summary>
/// Validator cho CreateUsageHistoryRequest
/// </summary>
public class CreateUsageHistoryRequestValidator : AbstractValidator<CreateUsageHistoryRequest>
{
    public CreateUsageHistoryRequestValidator()
    {
        RuleFor(x => x.VehicleId)
            .GreaterThan(0).WithMessage("Vehicle ID phải lớn hơn 0");

        RuleFor(x => x.CoOwnerId)
            .GreaterThan(0).WithMessage("CoOwner ID phải lớn hơn 0");

        RuleFor(x => x.StartTime)
            .NotEmpty().WithMessage("Thời gian bắt đầu không được để trống")
            .LessThan(x => x.EndTime).WithMessage("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");

        RuleFor(x => x.EndTime)
            .NotEmpty().WithMessage("Thời gian kết thúc không được để trống")
            .GreaterThan(DateTime.Now.AddDays(-30)).WithMessage("Thời gian kết thúc không được quá xa trong quá khứ");

        RuleFor(x => x.DistanceKm)
            .GreaterThan(0).WithMessage("Quãng đường phải lớn hơn 0")
            .LessThan(10000).WithMessage("Quãng đường không được vượt quá 10,000 km");

        RuleFor(x => x.StartBatteryLevel)
            .InclusiveBetween(0, 100).WithMessage("Mức pin bắt đầu phải từ 0% đến 100%");

        RuleFor(x => x.EndBatteryLevel)
            .InclusiveBetween(0, 100).WithMessage("Mức pin kết thúc phải từ 0% đến 100%");

        RuleFor(x => x.EnergyConsumed)
            .GreaterThanOrEqualTo(0).WithMessage("Năng lượng tiêu thụ không được âm")
            .LessThan(1000).WithMessage("Năng lượng tiêu thụ không được vượt quá 1000 kWh");

        RuleFor(x => x.Cost)
            .GreaterThanOrEqualTo(0).WithMessage("Chi phí không được âm")
            .LessThan(10000000).WithMessage("Chi phí không được vượt quá 10,000,000 VND");

        RuleFor(x => x.StartLocation)
            .MaximumLength(255).WithMessage("Địa điểm bắt đầu không được quá 255 ký tự");

        RuleFor(x => x.EndLocation)
            .MaximumLength(255).WithMessage("Địa điểm kết thúc không được quá 255 ký tự");

        RuleFor(x => x.Purpose)
            .MaximumLength(255).WithMessage("Mục đích sử dụng không được quá 255 ký tự");

        RuleFor(x => x.Notes)
            .MaximumLength(500).WithMessage("Ghi chú không được quá 500 ký tự");
    }
}

/// <summary>
/// Validator cho CreateChargingSessionRequest
/// </summary>
public class CreateChargingSessionRequestValidator : AbstractValidator<CreateChargingSessionRequest>
{
    public CreateChargingSessionRequestValidator()
    {
        RuleFor(x => x.VehicleId)
            .GreaterThan(0).WithMessage("Vehicle ID phải lớn hơn 0");

        RuleFor(x => x.CoOwnerId)
            .GreaterThan(0).WithMessage("CoOwner ID phải lớn hơn 0");

        RuleFor(x => x.StartTime)
            .NotEmpty().WithMessage("Thời gian bắt đầu sạc không được để trống")
            .LessThan(x => x.EndTime).WithMessage("Thời gian bắt đầu sạc phải nhỏ hơn thời gian kết thúc");

        RuleFor(x => x.EndTime)
            .NotEmpty().WithMessage("Thời gian kết thúc sạc không được để trống");

        RuleFor(x => x.StartBatteryLevel)
            .InclusiveBetween(0, 100).WithMessage("Mức pin bắt đầu phải từ 0% đến 100%");

        RuleFor(x => x.EndBatteryLevel)
            .InclusiveBetween(0, 100).WithMessage("Mức pin kết thúc phải từ 0% đến 100%")
            .GreaterThan(x => x.StartBatteryLevel).WithMessage("Mức pin kết thúc phải lớn hơn mức pin bắt đầu");

        RuleFor(x => x.EnergyConsumed)
            .GreaterThan(0).WithMessage("Năng lượng sạc phải lớn hơn 0")
            .LessThan(1000).WithMessage("Năng lượng sạc không được vượt quá 1000 kWh");

        RuleFor(x => x.Cost)
            .GreaterThanOrEqualTo(0).WithMessage("Chi phí sạc không được âm")
            .LessThan(1000000).WithMessage("Chi phí sạc không được vượt quá 1,000,000 VND");

        RuleFor(x => x.ChargingStationId)
            .MaximumLength(100).WithMessage("ID trạm sạc không được quá 100 ký tự");

        RuleFor(x => x.ChargingType)
            .Must(type => type == null || type == "AC" || type == "DC")
            .WithMessage("Loại sạc phải là AC hoặc DC");

        RuleFor(x => x.ChargingPower)
            .GreaterThan(0).WithMessage("Công suất sạc phải lớn hơn 0")
            .LessThan(500).WithMessage("Công suất sạc không được vượt quá 500 kW")
            .When(x => x.ChargingPower.HasValue);

        RuleFor(x => x.Location)
            .MaximumLength(255).WithMessage("Địa điểm sạc không được quá 255 ký tự");
    }
}

/// <summary>
/// Validator cho CreateMaintenanceRecordRequest
/// </summary>
public class CreateMaintenanceRecordRequestValidator : AbstractValidator<CreateMaintenanceRecordRequest>
{
    public CreateMaintenanceRecordRequestValidator()
    {
        RuleFor(x => x.VehicleId)
            .GreaterThan(0).WithMessage("Vehicle ID phải lớn hơn 0");

        RuleFor(x => x.MaintenanceType)
            .NotEmpty().WithMessage("Loại bảo dưỡng không được để trống")
            .MaximumLength(100).WithMessage("Loại bảo dưỡng không được quá 100 ký tự");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Mô tả không được quá 500 ký tự");

        RuleFor(x => x.ServiceProvider)
            .MaximumLength(255).WithMessage("Nhà cung cấp dịch vụ không được quá 255 ký tự");

        RuleFor(x => x.Cost)
            .GreaterThanOrEqualTo(0).WithMessage("Chi phí bảo dưỡng không được âm")
            .LessThan(10000000).WithMessage("Chi phí bảo dưỡng không được vượt quá 10,000,000 VND");

        RuleFor(x => x.MileageAtService)
            .GreaterThanOrEqualTo(0).WithMessage("Số km tại thời điểm bảo dưỡng không được âm")
            .LessThan(1000000).WithMessage("Số km tại thời điểm bảo dưỡng không được vượt quá 1,000,000 km");

        RuleFor(x => x.ServiceDate)
            .NotEmpty().WithMessage("Ngày bảo dưỡng không được để trống")
            .LessThanOrEqualTo(DateTime.Now).WithMessage("Ngày bảo dưỡng không được lớn hơn ngày hiện tại");

        RuleFor(x => x.NextServiceDue)
            .NotEmpty().WithMessage("Ngày bảo dưỡng tiếp theo không được để trống")
            .GreaterThan(x => x.ServiceDate).WithMessage("Ngày bảo dưỡng tiếp theo phải lớn hơn ngày bảo dưỡng hiện tại");

        RuleFor(x => x.Notes)
            .MaximumLength(500).WithMessage("Ghi chú không được quá 500 ký tự");
    }
}

/// <summary>
/// Validator cho CreateCostRecordRequest
/// </summary>
public class CreateCostRecordRequestValidator : AbstractValidator<CreateCostRecordRequest>
{
    public CreateCostRecordRequestValidator()
    {
        RuleFor(x => x.VehicleId)
            .GreaterThan(0).WithMessage("Vehicle ID phải lớn hơn 0");

        RuleFor(x => x.CoOwnerId)
            .GreaterThan(0).WithMessage("CoOwner ID phải lớn hơn 0");

        RuleFor(x => x.CostType)
            .NotEmpty().WithMessage("Loại chi phí không được để trống")
            .MaximumLength(50).WithMessage("Loại chi phí không được quá 50 ký tự");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Mô tả chi phí không được quá 500 ký tự");

        RuleFor(x => x.Amount)
            .GreaterThan(0).WithMessage("Số tiền phải lớn hơn 0")
            .LessThan(10000000).WithMessage("Số tiền không được vượt quá 10,000,000 VND");

        RuleFor(x => x.Currency)
            .NotEmpty().WithMessage("Đơn vị tiền tệ không được để trống")
            .Length(3).WithMessage("Đơn vị tiền tệ phải có 3 ký tự");

        RuleFor(x => x.ExpenseDate)
            .NotEmpty().WithMessage("Ngày phát sinh chi phí không được để trống")
            .LessThanOrEqualTo(DateTime.Now).WithMessage("Ngày phát sinh chi phí không được lớn hơn ngày hiện tại");

        RuleFor(x => x.Notes)
            .MaximumLength(500).WithMessage("Ghi chú không được quá 500 ký tự");
    }
}
