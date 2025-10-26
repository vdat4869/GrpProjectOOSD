using AutoMapper;
using HistoryAnalyticsService.Models;
using HistoryAnalyticsService.DTOs;

namespace HistoryAnalyticsService.Services;

/// <summary>
/// AutoMapper profile cho History Analytics Service
/// </summary>
public class HistoryMappingProfile : Profile
{
    public HistoryMappingProfile()
    {
        // Mapping cho UsageHistory
        CreateMap<UsageHistory, UsageHistoryDto>();
        CreateMap<CreateUsageHistoryRequest, UsageHistory>();

        // Mapping cho ChargingSession
        CreateMap<ChargingSession, ChargingSessionDto>();
        CreateMap<CreateChargingSessionRequest, ChargingSession>();

        // Mapping cho MaintenanceRecord
        CreateMap<MaintenanceRecord, MaintenanceRecordDto>();
        CreateMap<CreateMaintenanceRecordRequest, MaintenanceRecord>();

        // Mapping cho CostRecord
        CreateMap<CostRecord, CostRecordDto>();
        CreateMap<CreateCostRecordRequest, CostRecord>();

        // Mapping cho AnalyticsReport
        CreateMap<AnalyticsReport, AnalyticsReportDto>();
    }
}
