import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

export interface Dispute {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  relatedId: string;
  relatedType: string;
  status: string;
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisputeDto {
  type: string;
  title: string;
  description: string;
  severity: string;
  relatedId: string;
  relatedType: string;
}

export interface UpdateDisputeDto {
  status?: string;
  notes?: string;
  resolvedBy?: string;
}

export const disputeService = {
  async getDisputes(status?: string, type?: string): Promise<Dispute[]> {
    let endpoint = API_ENDPOINTS.DISPUTE?.DISPUTES || "/api/disputes";
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (type) params.append("type", type);
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const response = await apiClient.get<Dispute[]>(endpoint);
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getDisputeById(id: string): Promise<Dispute | null> {
    const endpoint = `${API_ENDPOINTS.DISPUTE?.DISPUTES || "/api/disputes"}/${id}`;
    const response = await apiClient.get<Dispute>(endpoint);
    return response.success && response.data ? response.data : null;
  },

  async createDispute(data: CreateDisputeDto): Promise<Dispute> {
    const endpoint = API_ENDPOINTS.DISPUTE?.DISPUTES || "/api/disputes";
    const response = await apiClient.post<Dispute>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create dispute");
    }
    return response.data;
  },

  async updateDispute(id: string, data: UpdateDisputeDto): Promise<Dispute> {
    const endpoint = `${API_ENDPOINTS.DISPUTE?.DISPUTES || "/api/disputes"}/${id}`;
    const response = await apiClient.put<Dispute>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update dispute");
    }
    return response.data;
  },

  async deleteDispute(id: string): Promise<void> {
    const endpoint = `${API_ENDPOINTS.DISPUTE?.DISPUTES || "/api/disputes"}/${id}`;
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete dispute");
    }
  },

  async bulkCreateDisputes(disputes: CreateDisputeDto[]): Promise<{ created: number; skipped: number; total: number }> {
    const endpoint = `${API_ENDPOINTS.DISPUTE?.DISPUTES || "/api/disputes"}/bulk`;
    const response = await apiClient.post<{ created: number; skipped: number; total: number }>(endpoint, disputes);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to bulk create disputes");
    }
    return response.data;
  },
};
