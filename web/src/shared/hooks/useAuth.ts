import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store';
import { authService } from '@shared/services';
import type { LoginRequest } from '@shared/types';
import { useLocation } from 'wouter';

/**
 * Hook for authentication operations
 */
export const useAuth = () => {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      // Save auth data to store
      setAuth(data.user, data.accessToken, data.refreshToken);

      // Invalidate only user-specific queries (not all cached data)
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });

      // Redirect based on mustChangePassword flag
      if (data.mustChangePassword) {
        setLocation('/first-login');
      } else {
        setLocation('/home');
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear auth state
      clearAuth();

      // Clear all cached queries
      queryClient.clear();

      // Redirect to login
      setLocation('/login');
    },
    onError: () => {
      // Even if logout API fails, clear local state
      clearAuth();
      queryClient.clear();
      setLocation('/login');
    },
  });

  return {
    // State
    user,
    isAuthenticated,
    token: accessToken,

    // Actions
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,

    // Loading states
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,

    // Errors
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
  };
};
