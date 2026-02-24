import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@shared/store';
import type { ApiErrorData } from '@shared/types/api.types';

// Get API base URL from environment or default to same origin
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Navigate without full page reload (SPA-friendly)
 * Uses a custom event that the router listens to, preserving app state
 */
function navigateTo(path: string): void {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { path } }));
}

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Single shared promise for token refresh - all concurrent 401s wait on the same promise.
// This eliminates the race condition where multiple requests could trigger
// simultaneous refresh attempts or resolve/reject subscribers out of order.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = useAuthStore.getState().refreshToken;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    useAuthStore.getState().setTokens(accessToken, newRefreshToken);

    return accessToken as string;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Request interceptor: Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token refresh and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear auth and redirect to login
        useAuthStore.getState().clearAuth();
        navigateTo('/login');
        return Promise.reject(refreshError);
      }
    }

    // If error is 403 with mustChangePassword flag, redirect to first-login
    if (error.response?.status === 403) {
      const errorData = error.response?.data as ApiErrorData | undefined;
      if (errorData?.mustChangePassword === true) {
        // Update user in store to ensure mustChangePassword is true
        useAuthStore.getState().updateUser({ mustChangePassword: true });
        navigateTo('/first-login');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
