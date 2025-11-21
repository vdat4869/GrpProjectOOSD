import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

export interface Booking {
  id: number;
  vehicleId: number;
  vehicleName?: string;
  coOwnerId: number;
  coOwnerName?: string;
  startTime: string;
  endTime: string;
  status: string;
  note?: string;
  qrCode?: string;
  checkInTime?: string;
  checkOutTime?: string;
  distanceKm?: number;
  cost?: number;
  createdAt?: string;
}

export interface CreateBookingRequest {
  vehicleId: number;
  coOwnerId: number;
  startTime: string;
  endTime: string;
  note?: string;
}

export interface UpdateBookingRequest {
  startTime: string;
  endTime: string;
  note?: string;
}

export interface CheckInRequest {
  qrCode?: string;
  digitalSignature?: string;
}

export interface CheckOutRequest {
  distanceKm: number;
  cost?: number;
  note?: string;
}

export interface QrCodeResponse {
  bookingId: number;
  qrCode: string;
  qrCodeImageUrl?: string;
  expiresAt?: string;
}

export interface VehicleSchedule {
  vehicleId: number;
  vehicleName: string;
  isActive: boolean;
  bookings: BookingPeriod[];
}

export interface BookingPeriod {
  startTime: string;
  endTime: string;
  coOwnerName?: string;
  status?: string;
  note?: string;
}

export interface Vehicle {
  id: number;
  name: string;
  isActive: boolean;
}

export const bookingService = {
  async getBookings(_userId?: string): Promise<Booking[]> {
    const response = await apiClient.get<Booking[]>(
      API_ENDPOINTS.BOOKING.BOOKINGS
    );
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getSchedules(): Promise<VehicleSchedule[]> {
    const response = await apiClient.get<VehicleSchedule[]>(
      API_ENDPOINTS.BOOKING.SCHEDULES
    );
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async getVehicles(): Promise<Vehicle[]> {
    const response = await apiClient.get<Vehicle[]>(
      API_ENDPOINTS.BOOKING.VEHICLES
    );
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  async createBooking(data: CreateBookingRequest): Promise<Booking> {
    const response = await apiClient.post<Booking>(
      API_ENDPOINTS.BOOKING.CREATE,
      data
    );
    if (!response.success || !response.data) {
      // Try to extract error message from response
      let errorMessage = response.message || "Failed to create booking";
      
      // If response.data exists but is an error object, extract error message
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        errorMessage = (response.data as any).error || errorMessage;
        if ((response.data as any).details) {
          errorMessage += `: ${(response.data as any).details}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    return response.data;
  },

  async updateBooking(id: number, data: UpdateBookingRequest): Promise<Booking> {
    const endpoint = API_ENDPOINTS.BOOKING.UPDATE.replace("{id}", id.toString());
    const response = await apiClient.put<Booking>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update booking");
    }
    return response.data;
  },

  async cancelBooking(id: number): Promise<void> {
    const endpoint = API_ENDPOINTS.BOOKING.CANCEL.replace("{id}", id.toString());
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to cancel booking");
    }
  },


  async getQrCode(id: number): Promise<QrCodeResponse> {
    const endpoint = API_ENDPOINTS.BOOKING.QR_CODE.replace("{id}", id.toString());
    const response = await apiClient.get<QrCodeResponse>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get QR code");
    }
    return response.data;
  },

  async checkIn(id: number, data: CheckInRequest): Promise<Booking> {
    const endpoint = API_ENDPOINTS.BOOKING.CHECK_IN.replace("{id}", id.toString());
    const response = await apiClient.post<Booking>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to check in");
    }
    return response.data;
  },

  async checkOut(id: number, data: CheckOutRequest): Promise<Booking> {
    const endpoint = API_ENDPOINTS.BOOKING.CHECK_OUT.replace("{id}", id.toString());
    const response = await apiClient.post<Booking>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to check out");
    }
    return response.data;
  },
};

