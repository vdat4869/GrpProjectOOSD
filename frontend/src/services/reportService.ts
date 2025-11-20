import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

// Analytics Interfaces
export interface UsageStatistics {
  totalUsageCount: number;
  totalDistance: number;
  totalEnergyConsumed: number;
  totalCost: number;
  averageUsageTime: number;
  averageDistancePerUsage: number;
  energyEfficiency: number;
}

export interface CostStatistics {
  costByType: Record<string, number>;
  costByCoOwner: Record<number, number>;
  averageMonthlyCost: number;
  averageCostPerKm: number;
}

export interface AnalyticsReport {
  id: number;
  vehicleId: number;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  reportData: string;
  generatedAt: string;
  createdAt: string;
  isActive: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

// History Interfaces
export interface UsageHistory {
  id: number;
  vehicleId: number;
  coOwnerId: number;
  startTime: string;
  endTime: string;
  startLocation?: string;
  endLocation?: string;
  distanceKm: number;
  startBatteryLevel: number;
  endBatteryLevel: number;
  energyConsumed: number;
  cost: number;
  purpose?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateUsageHistoryRequest {
  vehicleId: number;
  coOwnerId: number;
  startTime: string;
  endTime: string;
  startLocation?: string;
  endLocation?: string;
  distanceKm: number;
  startBatteryLevel: number;
  endBatteryLevel: number;
  energyConsumed: number;
  cost: number;
  purpose?: string;
  notes?: string;
}

export interface ChargingSession {
  id: number;
  vehicleId: number;
  coOwnerId: number;
  chargingStationId?: string;
  startTime: string;
  endTime: string;
  startBatteryLevel: number;
  endBatteryLevel: number;
  energyConsumed: number;
  cost: number;
  chargingType?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateChargingSessionRequest {
  vehicleId: number;
  coOwnerId: number;
  chargingStationId?: string;
  startTime: string;
  endTime: string;
  startBatteryLevel: number;
  endBatteryLevel: number;
  energyConsumed: number;
  cost: number;
  chargingType?: string;
  notes?: string;
}

export interface MaintenanceRecord {
  id: number;
  vehicleId: number;
  maintenanceType: string;
  description?: string;
  cost: number;
  currency: string;
  maintenanceDate: string;
  nextMaintenanceDate?: string;
  serviceProvider?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateMaintenanceRecordRequest {
  vehicleId: number;
  maintenanceType: string;
  description?: string;
  cost: number;
  currency?: string;
  maintenanceDate: string;
  nextMaintenanceDate?: string;
  serviceProvider?: string;
  notes?: string;
}

export const reportService = {
  // Analytics - Usage Statistics
  async getUsageStatistics(
    vehicleId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageStatistics | null> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());
    
    const endpoint = API_ENDPOINTS.REPORT.USAGE_STATISTICS.replace("{vehicleId}", vehicleId.toString());
    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    
    const response = await apiClient.get<ApiResponse<UsageStatistics>>(url);
    return response.success && response.data?.data ? response.data.data : null;
  },

  // Analytics - Cost Statistics
  async getCostStatistics(
    vehicleId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostStatistics | null> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());
    
    const endpoint = API_ENDPOINTS.REPORT.COST_STATISTICS.replace("{vehicleId}", vehicleId.toString());
    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    
    const response = await apiClient.get<ApiResponse<CostStatistics>>(url);
    return response.success && response.data?.data ? response.data.data : null;
  },

  // Analytics - Generate Reports
  async generateUsageReport(
    vehicleId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsReport | null> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    
    const endpoint = API_ENDPOINTS.REPORT.GENERATE_USAGE_REPORT.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.post<ApiResponse<AnalyticsReport>>(
      `${endpoint}?${params}`
    );
    return response.success && response.data?.data ? response.data.data : null;
  },

  async generateCostReport(
    vehicleId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsReport | null> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    
    const endpoint = API_ENDPOINTS.REPORT.GENERATE_COST_REPORT.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.post<ApiResponse<AnalyticsReport>>(
      `${endpoint}?${params}`
    );
    return response.success && response.data?.data ? response.data.data : null;
  },

  async generateMaintenanceReport(
    vehicleId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsReport | null> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    
    const endpoint = API_ENDPOINTS.REPORT.GENERATE_MAINTENANCE_REPORT.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.post<ApiResponse<AnalyticsReport>>(
      `${endpoint}?${params}`
    );
    return response.success && response.data?.data ? response.data.data : null;
  },

  async getReportsByVehicle(vehicleId: number): Promise<AnalyticsReport[]> {
    const endpoint = API_ENDPOINTS.REPORT.REPORTS_BY_VEHICLE.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.get<ApiResponse<AnalyticsReport[]>>(endpoint);
    return response.success && response.data?.data ? response.data.data : [];
  },

  async getReportsByType(reportType: string): Promise<AnalyticsReport[]> {
    const endpoint = API_ENDPOINTS.REPORT.REPORTS_BY_TYPE.replace("{reportType}", reportType);
    const response = await apiClient.get<ApiResponse<AnalyticsReport[]>>(endpoint);
    return response.success && response.data?.data ? response.data.data : [];
  },

  // History - Usage History
  async createUsageHistory(request: CreateUsageHistoryRequest): Promise<UsageHistory | null> {
    const response = await apiClient.post<ApiResponse<UsageHistory>>(
      API_ENDPOINTS.REPORT.USAGE_HISTORY,
      request
    );
    return response.success && response.data?.data ? response.data.data : null;
  },

  async getUsageHistoryById(id: number): Promise<UsageHistory | null> {
    const endpoint = API_ENDPOINTS.REPORT.USAGE_HISTORY_BY_ID.replace("{id}", id.toString());
    const response = await apiClient.get<ApiResponse<UsageHistory>>(endpoint);
    return response.success && response.data?.data ? response.data.data : null;
  },

  async getUsageHistoriesByVehicle(vehicleId: number): Promise<UsageHistory[]> {
    const endpoint = API_ENDPOINTS.REPORT.USAGE_HISTORY_BY_VEHICLE.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.get<ApiResponse<UsageHistory[]>>(endpoint);
    return response.success && response.data?.data ? response.data.data : [];
  },

  async getUsageHistoriesByCoOwner(coOwnerId: number): Promise<UsageHistory[]> {
    const endpoint = API_ENDPOINTS.REPORT.USAGE_HISTORY_BY_COOWNER.replace("{coOwnerId}", coOwnerId.toString());
    const response = await apiClient.get<ApiResponse<UsageHistory[]>>(endpoint);
    return response.success && response.data?.data ? response.data.data : [];
  },

  async getUsageHistoriesByDateRange(startDate: Date, endDate: Date): Promise<UsageHistory[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const response = await apiClient.get<ApiResponse<UsageHistory[]>>(
      `${API_ENDPOINTS.REPORT.USAGE_HISTORY_BY_DATE_RANGE}?${params}`
    );
    return response.success && response.data?.data ? response.data.data : [];
  },

  // History - Charging Sessions
  async createChargingSession(request: CreateChargingSessionRequest): Promise<ChargingSession | null> {
    const response = await apiClient.post<ApiResponse<ChargingSession>>(
      API_ENDPOINTS.REPORT.CHARGING_SESSION,
      request
    );
    return response.success && response.data?.data ? response.data.data : null;
  },

  async getChargingSessionById(id: number): Promise<ChargingSession | null> {
    const endpoint = API_ENDPOINTS.REPORT.CHARGING_SESSION_BY_ID.replace("{id}", id.toString());
    const response = await apiClient.get<ApiResponse<ChargingSession>>(endpoint);
    return response.success && response.data?.data ? response.data.data : null;
  },

  async getChargingSessionsByVehicle(vehicleId: number): Promise<ChargingSession[]> {
    const endpoint = API_ENDPOINTS.REPORT.CHARGING_SESSIONS_BY_VEHICLE.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.get<ApiResponse<ChargingSession[]>>(endpoint);
    return response.success && response.data?.data ? response.data.data : [];
  },

  async getChargingSessionsByCoOwner(coOwnerId: number): Promise<ChargingSession[]> {
    const endpoint = API_ENDPOINTS.REPORT.CHARGING_SESSIONS_BY_COOWNER.replace("{coOwnerId}", coOwnerId.toString());
    const response = await apiClient.get<ApiResponse<ChargingSession[]>>(endpoint);
    return response.success && response.data?.data ? response.data.data : [];
  },

  async getChargingSessionsByDateRange(startDate: Date, endDate: Date): Promise<ChargingSession[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const response = await apiClient.get<ApiResponse<ChargingSession[]>>(
      `${API_ENDPOINTS.REPORT.CHARGING_SESSIONS_BY_DATE_RANGE}?${params}`
    );
    return response.success && response.data?.data ? response.data.data : [];
  },

  // History - Maintenance Records
  async createMaintenanceRecord(request: CreateMaintenanceRecordRequest): Promise<MaintenanceRecord | null> {
    const response = await apiClient.post<ApiResponse<MaintenanceRecord>>(
      API_ENDPOINTS.REPORT.MAINTENANCE_RECORD,
      request
    );
    return response.success && response.data?.data ? response.data.data : null;
  },

  async getMaintenanceRecordById(id: number): Promise<MaintenanceRecord | null> {
    const endpoint = API_ENDPOINTS.REPORT.MAINTENANCE_RECORD_BY_ID.replace("{id}", id.toString());
    const response = await apiClient.get<ApiResponse<MaintenanceRecord>>(endpoint);
    return response.success && response.data?.data ? response.data.data : null;
  },

  async getMaintenanceRecordsByVehicle(vehicleId: number): Promise<MaintenanceRecord[]> {
    const endpoint = API_ENDPOINTS.REPORT.MAINTENANCE_RECORDS_BY_VEHICLE.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.get<ApiResponse<MaintenanceRecord[]>>(endpoint);
    return response.success && response.data?.data ? response.data.data : [];
  },

  async getMaintenanceRecordsByDateRange(startDate: Date, endDate: Date): Promise<MaintenanceRecord[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    const response = await apiClient.get<ApiResponse<MaintenanceRecord[]>>(
      `${API_ENDPOINTS.REPORT.MAINTENANCE_RECORDS_BY_DATE_RANGE}?${params}`
    );
    return response.success && response.data?.data ? response.data.data : [];
  },

};
