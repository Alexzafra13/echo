import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@shared/store';
import { authService } from '@shared/services';
import type { LoginRequest } from '@shared/types';
import { useLocation } from 'wouter';

export const useAuth = () => {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);

      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });

      if (data.mustChangePassword) {
        setLocation('/first-login');
      } else {
        setLocation('/home');
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      setLocation('/login');
    },
    onError: () => {
      // Limpiar estado local aunque falle la API
      clearAuth();
      queryClient.clear();
      setLocation('/login');
    },
  });

  return {
    user,
    isAuthenticated,
    token: accessToken,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
  };
};
