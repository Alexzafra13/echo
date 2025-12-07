import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/authStore';

// Get API URL based on environment
const getApiUrl = (): string => {
  // In development, use the debugger host IP (your computer's IP)
  if (__DEV__) {
    // expo-constants provides the host URI when running in Expo Go
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];

    if (debuggerHost) {
      return `http://${debuggerHost}:3000/api`;
    }

    // Fallback for different platforms in development
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to reach host machine
      return 'http://10.0.2.2:3000/api';
    }

    // iOS simulator can use localhost
    return 'http://localhost:3000/api';
  }

  // Production URL - update this with your actual API URL
  return 'https://your-api-domain.com/api';
};

const API_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            response.data;

          setTokens(newAccessToken, newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          clearAuth();
          // Navigation will be handled by the app based on auth state
        }
      } else {
        clearAuth();
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
