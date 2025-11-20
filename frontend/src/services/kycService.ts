import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

export enum KycStatus {
  NotSubmitted = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3,
}

export interface SubmitIdentityRequest {
  nationalIdNumber: string; // CMND/CCCD
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO yyyy-MM-dd
  address: string;
}

export interface SubmitIdentityResponse {
  accepted: boolean;
  referenceId: string;
  status: KycStatus;
  message: string;
}

export interface UploadLicenseRequest {
  licenseNumber: string;
  issuedDate: string; // ISO yyyy-MM-dd
  expiryDate: string; // ISO yyyy-MM-dd
}

export interface UploadLicenseResponse {
  accepted: boolean;
  referenceId: string;
  message: string;
}

export interface KycStatusResponse {
  status: KycStatus;
  message: string;
}

export const kycService = {
  async submitIdentity(data: SubmitIdentityRequest): Promise<SubmitIdentityResponse> {
    const response = await apiClient.post<SubmitIdentityResponse>(
      API_ENDPOINTS.KYC.SUBMIT_IDENTITY,
      data
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to submit identity");
    }
    return response.data;
  },

  async uploadLicense(
    file: File,
    metadata: UploadLicenseRequest
  ): Promise<UploadLicenseResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("licenseNumber", metadata.licenseNumber);
    formData.append("issuedDate", metadata.issuedDate);
    formData.append("expiryDate", metadata.expiryDate);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${API_ENDPOINTS.KYC.UPLOAD_LICENSE}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to upload license");
    }

    return data.data || data;
  },

  async getKycStatus(): Promise<KycStatusResponse> {
    const response = await apiClient.get<KycStatusResponse>(API_ENDPOINTS.KYC.STATUS);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get KYC status");
    }
    return response.data;
  },
};

