import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@echo/shared/types';

// Re-export User type for backward compatibility
export type { User } from '@echo/shared/types';

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  avatarTimestamp: number; // Cache-buster for avatar images

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateAvatarTimestamp: () => void; // Update timestamp to force avatar reload
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      avatarTimestamp: Date.now(),

      // Actions
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      updateAvatarTimestamp: () =>
        set({ avatarTimestamp: Date.now() }),
    }),
    {
      name: 'echo-auth-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
