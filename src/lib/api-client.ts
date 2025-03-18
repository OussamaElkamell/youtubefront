
import { toast } from "sonner";

// Base API URL - update this to match your server
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Get the JWT token from localStorage
const getToken = () => localStorage.getItem("token");

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    // Try to get error message from response
    let errorMessage = "An unexpected error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (error) {
      console.error("Failed to parse error response", error);
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
};

// Generic API request function
const apiRequest = async (
  endpoint: string, 
  method: string = "GET", 
  data?: unknown
): Promise<any> => {
  try {
    const token = getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const config: RequestInit = {
      method,
      headers,
      credentials: "include",
    };
    
    if (data && method !== "GET") {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    return await handleResponse(response);
  } catch (error) {
    console.error(`API ${method} request to ${endpoint} failed:`, error);
    throw error;
  }
};

// API client methods
export const api = {
  get: <T>(endpoint: string): Promise<T> => apiRequest(endpoint, "GET"),
  post: <T>(endpoint: string, data?: unknown): Promise<T> => apiRequest(endpoint, "POST", data),
  put: <T>(endpoint: string, data?: unknown): Promise<T> => apiRequest(endpoint, "PUT", data),
  delete: <T>(endpoint: string): Promise<T> => apiRequest(endpoint, "DELETE"),
};

// YouTube account specific API methods
export const youtubeAccountsApi = {
  getAll: () => api.get<{ accounts: any[] }>("/accounts"),
  getById: (id: string) => api.get<{ account: any }>(`/accounts/${id}`),
  add: (accountData: any) => api.post<{ account: any, message: string }>("/accounts", accountData),
  update: (id: string, updates: any) => api.put<{ account: any, message: string }>(`/accounts/${id}`, updates),
  delete: (id: string) => api.delete<{ message: string }>(`/accounts/${id}`),
  refreshToken: (id: string) => api.post<{ message: string, expiresAt: string }>(`/accounts/${id}/refresh-token`),
  verify: (id: string) => api.post<{ message: string, channel: any }>(`/accounts/${id}/verify`),
  getQuota: () => api.get<{ quota: any }>("/accounts/quota"),
};

// Comment specific API methods
export const commentsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) => 
    api.get<{ comments: any[], pagination: any }>(`/comments${params ? `?${new URLSearchParams(params as any).toString()}` : ''}`),
  getStats: () => api.get<{ comments: any[] }>("/comments/stats"),
};

// Scheduler specific API methods
export const schedulerApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) => 
    api.get<{ schedules: any[], pagination: any }>(`/scheduler${params ? `?${new URLSearchParams(params as any).toString()}` : ''}`),
  getById: (id: string) => api.get<{ schedule: any, comments: any[] }>(`/scheduler/${id}`),
  create: (scheduleData: any) => api.post<{ schedule: any, message: string }>("/scheduler", scheduleData),
  update: (id: string, updates: any) => api.put<{ schedule: any, message: string }>(`/scheduler/${id}`, updates),
  delete: (id: string) => api.delete<{ message: string }>(`/scheduler/${id}`),
  pause: (id: string) => api.post<{ schedule: any, message: string }>(`/scheduler/${id}/pause`),
  resume: (id: string) => api.post<{ schedule: any, message: string }>(`/scheduler/${id}/resume`),
  getSummary: () => api.get<{ schedulers: any }>("/scheduler/summary"),
};
