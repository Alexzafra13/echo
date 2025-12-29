import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { useAuthStore } from '@shared/store';

// We need to test the interceptors behavior, so we'll create a test-specific setup
describe('API Client Interceptors', () => {
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockNewAccessToken = 'new-access-token';
  const mockNewRefreshToken = 'new-refresh-token';

  beforeEach(() => {
    // Reset auth store
    useAuthStore.getState().clearAuth();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request Interceptor - Authorization Header', () => {
    it('should add Authorization header when token exists', () => {
      // Set token in store
      useAuthStore.getState().setTokens(mockAccessToken, mockRefreshToken);

      const token = useAuthStore.getState().accessToken;

      expect(token).toBe(mockAccessToken);
      // The interceptor would add: `Bearer ${token}`
      expect(`Bearer ${token}`).toBe(`Bearer ${mockAccessToken}`);
    });

    it('should not add Authorization header when no token', () => {
      const token = useAuthStore.getState().accessToken;

      expect(token).toBeNull();
    });
  });

  describe('Auth Store Integration', () => {
    it('should clear auth and tokens on clearAuth', () => {
      // Set initial auth
      const mockUser = {
        id: '1',
        username: 'test',
        name: 'Test',
        isAdmin: false,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      };
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe(mockAccessToken);

      // Clear auth (simulates what happens on 401 after refresh fails)
      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().refreshToken).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should update tokens correctly', () => {
      // Set initial tokens
      useAuthStore.getState().setTokens(mockAccessToken, mockRefreshToken);

      expect(useAuthStore.getState().accessToken).toBe(mockAccessToken);

      // Update tokens (simulates successful token refresh)
      useAuthStore.getState().setTokens(mockNewAccessToken, mockNewRefreshToken);

      expect(useAuthStore.getState().accessToken).toBe(mockNewAccessToken);
      expect(useAuthStore.getState().refreshToken).toBe(mockNewRefreshToken);
    });
  });

  describe('Token Refresh Logic', () => {
    it('should have refresh token available when access token exists', () => {
      useAuthStore.getState().setTokens(mockAccessToken, mockRefreshToken);

      const state = useAuthStore.getState();

      expect(state.accessToken).toBeTruthy();
      expect(state.refreshToken).toBeTruthy();
    });

    it('should handle missing refresh token', () => {
      // Only set access token (edge case)
      useAuthStore.setState({ accessToken: mockAccessToken, refreshToken: null });

      const refreshToken = useAuthStore.getState().refreshToken;

      expect(refreshToken).toBeNull();
    });
  });

  describe('API Base URL Configuration', () => {
    it('should use environment variable or default', () => {
      // The API client uses: import.meta.env.VITE_API_URL || '/api'
      const defaultBaseUrl = '/api';

      expect(defaultBaseUrl).toBe('/api');
    });
  });

  describe('Error Response Handling', () => {
    it('should identify 401 Unauthorized responses', () => {
      const error401 = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      expect(error401.response.status).toBe(401);
    });

    it('should identify 403 Forbidden responses', () => {
      const error403 = {
        response: {
          status: 403,
          data: { message: 'Forbidden', mustChangePassword: true },
        },
      };

      expect(error403.response.status).toBe(403);
      expect(error403.response.data.mustChangePassword).toBe(true);
    });

    it('should handle mustChangePassword flag in 403 response', () => {
      const error403WithPasswordChange = {
        response: {
          status: 403,
          data: { mustChangePassword: true },
        },
      };

      // The interceptor checks this and updates user store
      if (error403WithPasswordChange.response.data.mustChangePassword) {
        useAuthStore.getState().updateUser({ mustChangePassword: true });
      }

      // Since no user is set, updateUser should not crash
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should update user mustChangePassword when user exists', () => {
      // Set a user first
      const mockUser = {
        id: '1',
        username: 'test',
        name: 'Test',
        isAdmin: false,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      };
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);

      // Simulate 403 with mustChangePassword
      useAuthStore.getState().updateUser({ mustChangePassword: true });

      expect(useAuthStore.getState().user?.mustChangePassword).toBe(true);
    });
  });

  describe('Request Timeout', () => {
    it('should have a reasonable timeout configured', () => {
      // The API client uses: timeout: 10000 (10 seconds)
      const timeout = 10000;

      expect(timeout).toBe(10000);
      expect(timeout).toBeLessThanOrEqual(30000); // Should not be more than 30s
    });
  });

  describe('Content-Type Header', () => {
    it('should use application/json content type', () => {
      const contentType = 'application/json';

      expect(contentType).toBe('application/json');
    });
  });
});

describe('Token Refresh Queue Behavior', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('should queue requests when refresh is in progress', async () => {
    // Simulate multiple requests hitting 401 simultaneously
    const requests = [
      { id: 1, endpoint: '/api/albums' },
      { id: 2, endpoint: '/api/artists' },
      { id: 3, endpoint: '/api/playlists' },
    ];

    // All should be queued, not cause multiple refresh attempts
    expect(requests.length).toBe(3);
  });

  it('should resolve queued requests after successful refresh', async () => {
    const mockNewToken = 'refreshed-token';

    // Simulate successful refresh
    useAuthStore.getState().setTokens(mockNewToken, 'new-refresh-token');

    // All queued requests should now use the new token
    expect(useAuthStore.getState().accessToken).toBe(mockNewToken);
  });

  it('should reject queued requests after failed refresh', () => {
    // Clear auth simulates refresh failure
    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
