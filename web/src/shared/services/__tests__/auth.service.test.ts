import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth.service';
import apiClient from '../api';
import type { LoginRequest, LoginResponse, RefreshTokenResponse } from '@shared/types';

// Mock the api client
vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    const mockCredentials: LoginRequest = {
      username: 'testuser',
      password: 'testpassword',
    };

    const mockLoginResponse: LoginResponse = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      mustChangePassword: false,
      user: {
        id: '1',
        username: 'testuser',
        name: 'Test User',
        isAdmin: false,
      },
    };

    it('should call /auth/login with credentials', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockLoginResponse });

      await authService.login(mockCredentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', mockCredentials);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('should return login response on success', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockLoginResponse });

      const result = await authService.login(mockCredentials);

      expect(result).toEqual(mockLoginResponse);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.username).toBe('testuser');
    });

    it('should handle mustChangePassword flag', async () => {
      const responseWithPasswordChange: LoginResponse = {
        ...mockLoginResponse,
        mustChangePassword: true,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: responseWithPasswordChange });

      const result = await authService.login(mockCredentials);

      expect(result.mustChangePassword).toBe(true);
    });

    it('should handle admin user login', async () => {
      const adminResponse: LoginResponse = {
        ...mockLoginResponse,
        user: { ...mockLoginResponse.user, isAdmin: true },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: adminResponse });

      const result = await authService.login(mockCredentials);

      expect(result.user.isAdmin).toBe(true);
    });

    it('should throw error on invalid credentials', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(authService.login(mockCredentials)).rejects.toEqual(error);
    });

    it('should throw error on network failure', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(apiClient.post).mockRejectedValueOnce(networkError);

      await expect(authService.login(mockCredentials)).rejects.toThrow('Network Error');
    });
  });

  describe('refreshToken', () => {
    const mockRefreshRequest = {
      refreshToken: 'old-refresh-token',
    };

    const mockRefreshResponse: RefreshTokenResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    };

    it('should call /auth/refresh with refresh token', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockRefreshResponse });

      await authService.refreshToken(mockRefreshRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', mockRefreshRequest);
    });

    it('should return new tokens on success', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockRefreshResponse });

      const result = await authService.refreshToken(mockRefreshRequest);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error on invalid refresh token', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid refresh token' },
        },
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(authService.refreshToken(mockRefreshRequest)).rejects.toEqual(error);
    });

    it('should throw error on expired refresh token', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Refresh token expired' },
        },
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(authService.refreshToken(mockRefreshRequest)).rejects.toEqual(error);
    });
  });

  describe('logout', () => {
    it('should call /auth/logout', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('should not throw on successful logout', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await expect(authService.logout()).resolves.toBeUndefined();
    });

    it('should handle logout error gracefully', async () => {
      const error = new Error('Logout failed');
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(authService.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('getCurrentUser', () => {
    const mockUserResponse = {
      id: '1',
      username: 'testuser',
      name: 'Test User',
      isAdmin: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    it('should call /users/me', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUserResponse });

      await authService.getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/users/me');
    });

    it('should return current user data', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockUserResponse });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUserResponse);
      expect(result.username).toBe('testuser');
    });

    it('should throw error when not authenticated', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(authService.getCurrentUser()).rejects.toEqual(error);
    });
  });
});
