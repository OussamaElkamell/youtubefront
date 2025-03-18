
import { toast } from "sonner";
import { api } from "./api-client";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials extends LoginCredentials {
  name: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Get the current authenticated user
export const getCurrentUser = async () => {
  try {
    const response = await api.get<{ user: any }>("/auth/me");
    return response.user;
  } catch (error) {
    console.error("Failed to get current user", error);
    return null;
  }
};

// Login user
export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    
    // Store token
    localStorage.setItem("token", response.token);
    
    toast.success("Login successful", {
      description: `Welcome back, ${response.user.name || response.user.email}!`,
    });
    
    return response;
  } catch (error) {
    console.error("Login failed", error);
    toast.error("Login failed", {
      description: (error as Error).message || "Please check your credentials and try again",
    });
    throw error;
  }
};

// Register user
export const registerUser = async (credentials: RegisterCredentials): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>("/auth/register", credentials);
    
    // Store token
    localStorage.setItem("token", response.token);
    
    toast.success("Registration successful", {
      description: `Welcome, ${response.user.name || response.user.email}!`,
    });
    
    return response;
  } catch (error) {
    console.error("Registration failed", error);
    toast.error("Registration failed", {
      description: (error as Error).message || "Please try with a different email",
    });
    throw error;
  }
};

// Request password reset
export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    await api.post("/auth/forgot-password", { email });
    
    toast.success("Password reset email sent", {
      description: "Please check your email for instructions",
    });
  } catch (error) {
    console.error("Password reset request failed", error);
    toast.error("Password reset request failed", {
      description: (error as Error).message || "Please try again later",
    });
    throw error;
  }
};

// Reset password
export const resetPassword = async (token: string, password: string): Promise<void> => {
  try {
    await api.post("/auth/reset-password", { token, password });
    
    toast.success("Password reset successful", {
      description: "You can now log in with your new password",
    });
  } catch (error) {
    console.error("Password reset failed", error);
    toast.error("Password reset failed", {
      description: (error as Error).message || "Invalid or expired token. Please request a new reset link.",
    });
    throw error;
  }
};

// Logout user
export const logoutUser = () => {
  localStorage.removeItem("token");
  toast.success("Logged out successfully");
  // You may want to redirect to login page here
  window.location.href = "/login";
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return Boolean(localStorage.getItem("token"));
};
