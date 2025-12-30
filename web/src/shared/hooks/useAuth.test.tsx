import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useAuthStore } from '@shared/store';
import * as authService from '@shared/services/auth.service';
import { type ReactNode } from 'react';
import type { LoginResponse } from '@shared/types';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => {
    const setLocation = vi.fn();
    return ['/', setLocation];
  },
}));

// Mock auth service
vi.mock('@shared/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('useAuth', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    return Wrapper;
  };

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Reset auth store
    useAuthStore.getState().clearAuth();

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial unauthenticated state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should provide login and logout functions', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
    });

    it('should provide loading states', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoggingIn).toBe(false);
      expect(result.current.isLoggingOut).toBe(false);
    });

    it('should provide error states', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loginError).toBeNull();
      expect(result.current.logoutError).toBeNull();
    });
  });

  describe('login', () => {
    it('should update store on successful login', async () => {
      const mockResponse = {
        user: {
          id: '1',
          username: 'testuser',
          isAdmin: false,
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        mustChangePassword: false,
      };

      vi.mocked(authService.authService.login).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      result.current.login({
        username: 'testuser',
        password: 'password123',
      });

      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(false);
      });

      const authState = useAuthStore.getState();
      expect(authState.user).toEqual(mockResponse.user);
      expect(authState.accessToken).toBe(mockResponse.accessToken);
      expect(authState.refreshToken).toBe(mockResponse.refreshToken);
      expect(authState.isAuthenticated).toBe(true);
    });

    it('should set loading state during login', async () => {
      const mockResponse = {
        user: {
          id: '1',
          username: 'testuser',
          isAdmin: false,
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        mustChangePassword: false,
      };

      let resolveLogin: (value: LoginResponse) => void;
      const loginPromise = new Promise<LoginResponse>((resolve) => {
        resolveLogin = resolve;
      });

      vi.mocked(authService.authService.login).mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      result.current.login({
        username: 'testuser',
        password: 'password',
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(true);
      });

      // Resolve login
      resolveLogin!(mockResponse);

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isLoggingIn).toBe(false);
      });
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');

      vi.mocked(authService.authService.login).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      result.current.login({
        username: 'testuser',
        password: 'wrongpassword',
      });

      await waitFor(() => {
        expect(result.current.loginError).toBeTruthy();
      });
    });
  });

  describe('logout', () => {
    it('should clear auth state on successful logout', async () => {
      // Set up authenticated state
      useAuthStore.getState().setAuth(
        {
          id: '1',
          username: 'testuser',
          isAdmin: false,
        },
        'access-token',
        'refresh-token'
      );

      vi.mocked(authService.authService.logout).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Verify initial state
      expect(result.current.isAuthenticated).toBe(true);

      result.current.logout();

      await waitFor(() => {
        expect(result.current.isLoggingOut).toBe(false);
      });

      const authState = useAuthStore.getState();
      expect(authState.user).toBeNull();
      expect(authState.accessToken).toBeNull();
      expect(authState.refreshToken).toBeNull();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should clear state even if logout API fails', async () => {
      // Set up authenticated state
      useAuthStore.getState().setAuth(
        {
          id: '1',
          username: 'testuser',
          isAdmin: false,
        },
        'access-token',
        'refresh-token'
      );

      vi.mocked(authService.authService.logout).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      result.current.logout();

      await waitFor(() => {
        expect(result.current.isLoggingOut).toBe(false);
      });

      // Should still clear local state
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
    });

    it('should set loading state during logout', async () => {
      useAuthStore.getState().setAuth(
        {
          id: '1',
          username: 'testuser',
          isAdmin: false,
        },
        'access-token',
        'refresh-token'
      );

      let resolveLogout: (value: void) => void;
      const logoutPromise = new Promise<void>((resolve) => {
        resolveLogout = resolve;
      });

      vi.mocked(authService.authService.logout).mockReturnValue(logoutPromise);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      result.current.logout();

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoggingOut).toBe(true);
      });

      // Resolve logout
      resolveLogout!(undefined);

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isLoggingOut).toBe(false);
      });
    });
  });

  describe('authenticated user state', () => {
    it('should reflect authenticated user from store', () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        isAdmin: true,
      };

      useAuthStore.getState().setAuth(
        mockUser,
        'access-token',
        'refresh-token'
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('access-token');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
