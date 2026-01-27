import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Current store version - increment when changing the persisted state structure
const STORE_VERSION = 1;

export interface User {
  id: string;
  username: string;
  name?: string;
  isAdmin: boolean;
  hasAvatar?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
}

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

// Initial state values (used for defaults and reset)
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  avatarTimestamp: Date.now(),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

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
      name: 'echo-auth-storage',
      version: STORE_VERSION,

      // Migration: handle old store versions
      migrate: (persistedState, version) => {
        // If no version or very old, reset to clean state
        if (version === 0 || !persistedState) {
          return initialState;
        }
        // Future migrations can be added here:
        // if (version < 2) { /* migrate v1 to v2 */ }
        return persistedState as AuthState;
      },

      // Error handling: if rehydration fails, clear corrupted data
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('[AuthStore] Error loading persisted state:', error);
          localStorage.removeItem('echo-auth-storage');
        }
      },

      // Safe merge: ensure defaults are always present
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<AuthState> || {}),
      }),

      // Only persist essential auth data
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
