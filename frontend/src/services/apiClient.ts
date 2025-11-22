// API Client with authentication
import { API_BASE_URL } from "../config/api";
import { API_ENDPOINTS } from "../config/api";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

class ApiClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  }

  private async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          this.logout();
          return null;
        }

        const response = await fetch(`${this.baseURL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          this.logout();
          return null;
        }

        const data = await response.json();
        if (data.success && data.data) {
          const { accessToken, refreshToken: newRefreshToken } = data.data;
          
          if (typeof window !== "undefined") {
            localStorage.setItem("token", accessToken);
            if (newRefreshToken) {
              localStorage.setItem("refreshToken", newRefreshToken);
            }
          }

          return accessToken;
        }

        this.logout();
        return null;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        this.logout();
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("firstName");
      localStorage.removeItem("email");
      // Redirect to login page
      window.location.href = "/signin";
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 204 No Content (empty response body) - don't try to read body
      if (response.status === 204) {
        return {
          success: true,
          message: "Operation completed successfully",
        };
      }

      // Check content-type before reading body
      const contentType = response.headers.get("content-type");
      const hasBody = contentType && (contentType.includes("application/json") || contentType.includes("text/"));
      
      // If no content-type or empty body, return success for 2xx status codes
      if (!hasBody && response.ok) {
        return {
          success: true,
          message: "Operation completed successfully",
        };
      }

      let data;
      try {
        const text = await response.text();
        // If text is empty, return success for 2xx status codes
        if (!text || text.trim() === "") {
          return {
            success: response.ok,
            message: response.ok ? "Operation completed successfully" : `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        // Try to parse as JSON
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          // Not JSON, return as text (cast to T for type safety)
          return {
            success: response.ok,
            message: text || `HTTP ${response.status}: ${response.statusText}`,
            data: text as T,
          };
        }
      } catch (readError) {
        // Can't read body, return based on status
        return {
          success: response.ok,
          message: response.ok ? "Operation completed successfully" : `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && token) {
        // Don't retry refresh for auth endpoints to avoid infinite loop
        const isAuthEndpoint = endpoint.includes("/api/auth/");
        if (!isAuthEndpoint) {
          const newToken = await this.refreshAccessToken();
          if (newToken) {
            // Retry the original request with new token
            headers["Authorization"] = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
            });

            let retryData;
            try {
              retryData = await retryResponse.json();
            } catch (jsonError) {
              const text = await retryResponse.text();
              return {
                success: false,
                message: text || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`,
              };
            }

            if (!retryResponse.ok) {
              return {
                success: false,
                message: retryData.error || retryData.message || `HTTP ${retryResponse.status}`,
                data: retryData,
                errors: retryData.errors,
              };
            }

            return {
              success: true,
              data: retryData.data || retryData,
              message: retryData.message,
            };
          }
        }
      }

      if (!response.ok) {
        return {
          success: false,
          message: data.error || data.message || `HTTP ${response.status}`,
          data: data, // Include full error object
          errors: data.errors,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Network error occurred",
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

