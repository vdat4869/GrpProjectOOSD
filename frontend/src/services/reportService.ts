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
  mileageAtService?: number;
  status?: string;
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

export interface UpdateMaintenanceRecordRequest {
  maintenanceType?: string;
  description?: string;
  cost?: number;
  maintenanceDate?: string;
  nextMaintenanceDate?: string;
  serviceProvider?: string;
  notes?: string;
  mileageAtService?: number;
  status?: number; // 0=Scheduled, 1=InProgress, 2=Completed, 3=Overdue
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
    
    const response = await apiClient.get<UsageStatistics>(url);
    return response.success && response.data ? response.data : null;
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
    
    const response = await apiClient.get<CostStatistics>(url);
    return response.success && response.data ? response.data : null;
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
    const response = await apiClient.post<AnalyticsReport>(
      `${endpoint}?${params}`
    );
    return response.success && response.data ? response.data : null;
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
    const response = await apiClient.post<AnalyticsReport>(
      `${endpoint}?${params}`
    );
    return response.success && response.data ? response.data : null;
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
    const response = await apiClient.post<AnalyticsReport>(
      `${endpoint}?${params}`
    );
    return response.success && response.data ? response.data : null;
  },

  async getReportsByVehicle(vehicleId: number): Promise<AnalyticsReport[]> {
    const endpoint = API_ENDPOINTS.REPORT.REPORTS_BY_VEHICLE.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.get<AnalyticsReport[]>(endpoint);
    return response.success && response.data ? (Array.isArray(response.data) ? response.data : []) : [];
  },

  async getReportsByType(reportType: string): Promise<AnalyticsReport[]> {
    const endpoint = API_ENDPOINTS.REPORT.REPORTS_BY_TYPE.replace("{reportType}", reportType);
    const response = await apiClient.get<AnalyticsReport[]>(endpoint);
    return response.success && response.data ? (Array.isArray(response.data) ? response.data : []) : [];
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
  async createMaintenanceRecord(request: CreateMaintenanceRecordRequest & { mileageAtService?: number }): Promise<MaintenanceRecord | null> {
    // Convert frontend format to backend format
    const maintenanceDate = new Date(request.maintenanceDate);
    const nextMaintenanceDate = request.nextMaintenanceDate 
      ? new Date(request.nextMaintenanceDate)
      : new Date(maintenanceDate.getTime() + 90 * 24 * 60 * 60 * 1000); // Default to 90 days later
    
    // Ensure NextServiceDue is after ServiceDate
    if (nextMaintenanceDate <= maintenanceDate) {
      nextMaintenanceDate.setTime(maintenanceDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    }
    
    const backendRequest = {
      vehicleId: request.vehicleId,
      maintenanceType: request.maintenanceType,
      description: request.description || null,
      cost: request.cost,
      serviceDate: maintenanceDate.toISOString(),
      nextServiceDue: nextMaintenanceDate.toISOString(),
      mileageAtService: request.mileageAtService ?? 0,
      serviceProvider: request.serviceProvider || null,
      notes: request.notes || null,
    };
    
    const response = await apiClient.post<any>(
      API_ENDPOINTS.REPORT.MAINTENANCE_RECORD,
      backendRequest
    );
    
    if (!response.success || !response.data) {
      return null;
    }
    
    // Map backend DTO format to frontend interface format
    const record = response.data as any;
    return {
      id: record.id,
      vehicleId: record.vehicleId,
      maintenanceType: record.maintenanceType,
      description: record.description,
      cost: record.cost,
      currency: "VND",
      maintenanceDate: record.serviceDate ? new Date(record.serviceDate).toISOString().split("T")[0] : "",
      nextMaintenanceDate: record.nextServiceDue ? new Date(record.nextServiceDue).toISOString().split("T")[0] : undefined,
      serviceProvider: record.serviceProvider,
      notes: record.notes,
      createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
      isActive: record.isActive ?? true,
      mileageAtService: record.mileageAtService,
      status: record.status,
    };
  },

  async getMaintenanceRecordById(id: number): Promise<MaintenanceRecord | null> {
    const endpoint = API_ENDPOINTS.REPORT.MAINTENANCE_RECORD_BY_ID.replace("{id}", id.toString());
    const response = await apiClient.get<ApiResponse<MaintenanceRecord>>(endpoint);
    return response.success && response.data?.data ? response.data.data : null;
  },

  async getMaintenanceRecordsByVehicle(vehicleId: number): Promise<MaintenanceRecord[]> {
    const endpoint = API_ENDPOINTS.REPORT.MAINTENANCE_RECORDS_BY_VEHICLE.replace("{vehicleId}", vehicleId.toString());
    const response = await apiClient.get<MaintenanceRecord[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    // Map backend DTO format to frontend interface format
    return response.data.map((record: any) => ({
      id: record.id,
      vehicleId: record.vehicleId,
      maintenanceType: record.maintenanceType,
      description: record.description,
      cost: record.cost,
      currency: "VND", // Default currency
      maintenanceDate: record.serviceDate ? new Date(record.serviceDate).toISOString().split("T")[0] : "",
      nextMaintenanceDate: record.nextServiceDue ? new Date(record.nextServiceDue).toISOString().split("T")[0] : undefined,
      serviceProvider: record.serviceProvider,
      notes: record.notes,
      createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
      isActive: record.isActive ?? true,
    }));
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

  async updateMaintenanceRecord(id: number, request: UpdateMaintenanceRecordRequest): Promise<MaintenanceRecord | null> {
    const endpoint = API_ENDPOINTS.REPORT.MAINTENANCE_RECORD_BY_ID.replace("{id}", id.toString());
    // Convert frontend format to backend format
    const backendRequest: any = {};
    if (request.maintenanceType !== undefined) backendRequest.maintenanceType = request.maintenanceType;
    if (request.description !== undefined) backendRequest.description = request.description;
    if (request.cost !== undefined) backendRequest.cost = request.cost;
    if (request.maintenanceDate !== undefined) backendRequest.serviceDate = new Date(request.maintenanceDate).toISOString();
    if (request.nextMaintenanceDate !== undefined) backendRequest.nextServiceDue = new Date(request.nextMaintenanceDate).toISOString();
    if (request.serviceProvider !== undefined) backendRequest.serviceProvider = request.serviceProvider;
    if (request.notes !== undefined) backendRequest.notes = request.notes;
    if (request.mileageAtService !== undefined) backendRequest.mileageAtService = request.mileageAtService;
    if (request.status !== undefined) backendRequest.status = request.status;
    
    const response = await apiClient.put<MaintenanceRecord>(endpoint, backendRequest);
    if (!response.success || !response.data) {
      return null;
    }
    // Map backend response to frontend format
    const record = response.data as any;
    return {
      id: record.id,
      vehicleId: record.vehicleId,
      maintenanceType: record.maintenanceType,
      description: record.description,
      cost: record.cost,
      currency: "VND",
      maintenanceDate: record.serviceDate ? new Date(record.serviceDate).toISOString().split("T")[0] : "",
      nextMaintenanceDate: record.nextServiceDue ? new Date(record.nextServiceDue).toISOString().split("T")[0] : undefined,
      serviceProvider: record.serviceProvider,
      notes: record.notes,
      createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
      isActive: record.isActive ?? true,
    };
  },

  async markMaintenanceAsCompleted(id: number): Promise<MaintenanceRecord | null> {
    const endpoint = `${API_ENDPOINTS.REPORT.MAINTENANCE_RECORD_BY_ID.replace("{id}", id.toString())}/complete`;
    try {
      const response = await apiClient.post<MaintenanceRecord>(endpoint, {});
      if (!response.success) {
        const errorMessage = response.message || response.errors?.join(", ") || "Failed to mark maintenance as completed";
        throw new Error(errorMessage);
      }
      if (!response.data) {
        throw new Error("No data returned from server");
      }
      // Map backend response to frontend format
      const record = response.data as any;
      return {
        id: record.id,
        vehicleId: record.vehicleId,
        maintenanceType: record.maintenanceType,
        description: record.description,
        cost: record.cost,
        currency: "VND",
        maintenanceDate: record.serviceDate ? new Date(record.serviceDate).toISOString().split("T")[0] : "",
        nextMaintenanceDate: record.nextServiceDue ? new Date(record.nextServiceDue).toISOString().split("T")[0] : undefined,
        serviceProvider: record.serviceProvider,
        notes: record.notes,
        createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
        isActive: record.isActive ?? true,
        mileageAtService: record.mileageAtService,
        status: record.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to mark maintenance as completed";
      throw new Error(errorMessage);
    }
  },

  async deleteMaintenanceRecord(id: number): Promise<boolean> {
    const endpoint = API_ENDPOINTS.REPORT.MAINTENANCE_RECORD_BY_ID.replace("{id}", id.toString());
    const response = await apiClient.delete(endpoint);
    return response.success;
  },

};
