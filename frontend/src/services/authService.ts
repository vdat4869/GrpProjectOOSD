import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  identityNumber?: string;
  roles?: string[];
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  createdAt: string;
  isActive: boolean;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      { email, password }
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Login failed");
    }

    // Store token and user info
    if (typeof window !== "undefined" && response.data) {
      localStorage.setItem("token", response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem("refreshToken", response.data.refreshToken);
      }
      if (response.data.user) {
        localStorage.setItem("userId", response.data.user.id.toString());
        localStorage.setItem("email", response.data.user.email);
        localStorage.setItem("firstName", response.data.user.firstName);
        if (response.data.user.roles && response.data.user.roles.length > 0) {
          localStorage.setItem("role", response.data.user.roles[0]);
        }
      }
    }

    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Registration failed");
    }

    // Store token and user info
    if (typeof window !== "undefined" && response.data) {
      localStorage.setItem("token", response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem("refreshToken", response.data.refreshToken);
      }
      if (response.data.user) {
        localStorage.setItem("userId", response.data.user.id.toString());
        localStorage.setItem("email", response.data.user.email);
        localStorage.setItem("firstName", response.data.user.firstName);
        if (response.data.user.roles && response.data.user.roles.length > 0) {
          localStorage.setItem("role", response.data.user.roles[0]);
        }
      }
    }

    return response.data;
  },

  async logout(): Promise<void> {
    try {
      // Call backend logout API
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear local storage regardless of API call result
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        localStorage.removeItem("firstName");
        localStorage.removeItem("email");
      }
    }
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.PROFILE);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get profile");
    }
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get current user");
    }
    return response.data;
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
    if (!response.success) {
      throw new Error(response.message || "Failed to change password");
    }
  },

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refreshToken }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to refresh token");
    }

    // Update stored token
    if (typeof window !== "undefined" && response.data) {
      localStorage.setItem("token", response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem("refreshToken", response.data.refreshToken);
      }
    }

    return response.data;
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("token");
  },

  // Admin: User Management
  async getUsers(search?: string, page: number = 1, pageSize: number = 10): Promise<PagedUsersResponse> {
    let endpoint = `${API_ENDPOINTS.ROLE.USERS}?page=${page}&pageSize=${pageSize}`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }
    const response = await apiClient.get<PagedUsersResponse>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get users");
    }
    return response.data;
  },

  async getUserDetails(userId: number): Promise<UserSummary> {
    const endpoint = API_ENDPOINTS.ROLE.USER_DETAILS.replace("{userId}", userId.toString());
    const response = await apiClient.get<UserSummary>(endpoint);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get user details");
    }
    return response.data;
  },

  async updateUser(userId: number, data: { firstName?: string; lastName?: string; email?: string }): Promise<UserSummary> {
    const endpoint = API_ENDPOINTS.ROLE.UPDATE_USER.replace("{userId}", userId.toString());
    const response = await apiClient.put<UserSummary>(endpoint, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update user");
    }
    return response.data;
  },

  async deleteUser(userId: number): Promise<void> {
    const endpoint = API_ENDPOINTS.ROLE.DELETE_USER.replace("{userId}", userId.toString());
    const response = await apiClient.delete(endpoint);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete user");
    }
  },

  async assignRole(userId: number, roleName: string): Promise<void> {
    const endpoint = API_ENDPOINTS.ROLE.ASSIGN_ROLE.replace("{userId}", userId.toString());
    const response = await apiClient.post(endpoint, { roleName });
    if (!response.success) {
      throw new Error(response.message || "Failed to assign role");
    }
  },

  async removeRole(userId: number, roleName: string): Promise<void> {
    const endpoint = API_ENDPOINTS.ROLE.REMOVE_ROLE.replace("{userId}", userId.toString());
    const response = await apiClient.delete(endpoint, { roleName });
    if (!response.success) {
      throw new Error(response.message || "Failed to remove role");
    }
  },
};

export interface UserSummary {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  roles: string[];
}

export interface PagedUsersResponse {
  page: number;
  pageSize: number;
  total: number;
  users: UserSummary[];
}

