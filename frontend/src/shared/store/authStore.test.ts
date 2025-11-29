import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { User } from './authStore';

describe('authStore', () => {
  const mockUser: User = {
    id: '1',
    username: 'testuser',
    name: 'Test User',
    isAdmin: false,
    mustChangePassword: false,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';

  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.getState().clearAuth();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setAuth', () => {
    it('should set user and tokens correctly', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);

      const state = useAuthStore.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(mockAccessToken);
      expect(state.refreshToken).toBe(mockRefreshToken);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should mark user as authenticated', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);

      state.setAuth(mockUser, mockAccessToken, mockRefreshToken);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('updateUser', () => {
    it('should update user data partially', () => {
      // First set auth
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);

      // Then update user
      useAuthStore.getState().updateUser({ name: 'Updated Name' });

      const state = useAuthStore.getState();

      expect(state.user).toEqual({
        ...mockUser,
        name: 'Updated Name',
      });
    });

    it('should not affect other user properties', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);

      useAuthStore.getState().updateUser({ name: 'New Name' });

      const state = useAuthStore.getState();

      expect(state.user?.id).toBe(mockUser.id);
      expect(state.user?.username).toBe(mockUser.username);
      expect(state.user?.name).toBe('New Name');
    });

    it('should do nothing if user is null', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();

      state.updateUser({ name: 'Should Not Update' });

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth data', () => {
      // First set auth
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);

      // Verify it's set
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Clear auth
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setTokens', () => {
    it('should update tokens without affecting user', () => {
      // Set initial auth
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);

      // Update tokens
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

      const state = useAuthStore.getState();

      expect(state.accessToken).toBe(newAccessToken);
      expect(state.refreshToken).toBe(newRefreshToken);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should update tokens even if user is null', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();

      state.setTokens(mockAccessToken, mockRefreshToken);

      const updatedState = useAuthStore.getState();

      expect(updatedState.accessToken).toBe(mockAccessToken);
      expect(updatedState.refreshToken).toBe(mockRefreshToken);
      expect(updatedState.user).toBeNull();
    });
  });

  describe('admin user', () => {
    it('should handle admin user correctly', () => {
      const adminUser: User = {
        ...mockUser,
        isAdmin: true,
      };

      useAuthStore.getState().setAuth(adminUser, mockAccessToken, mockRefreshToken);

      const state = useAuthStore.getState();

      expect(state.user?.isAdmin).toBe(true);
    });
  });

  describe('mustChangePassword flag', () => {
    it('should handle mustChangePassword flag', () => {
      const userNeedsPasswordChange: User = {
        ...mockUser,
        mustChangePassword: true,
      };

      useAuthStore.getState().setAuth(userNeedsPasswordChange, mockAccessToken, mockRefreshToken);

      const state = useAuthStore.getState();

      expect(state.user?.mustChangePassword).toBe(true);
    });
  });
});
