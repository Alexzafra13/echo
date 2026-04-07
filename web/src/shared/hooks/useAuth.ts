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
    onSuccess: async (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user'] }),
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['playlists'] }),
      ]);

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
      // Borrar solo queries que dependen del usuario autenticado.
      // Mantener cache de datos publicos (setup, server info) para
      // evitar re-fetch masivo si el usuario hace login de nuevo.
      queryClient.removeQueries({ queryKey: ['user'] });
      queryClient.removeQueries({ queryKey: ['admin'] });
      queryClient.removeQueries({ queryKey: ['playlists'] });
      queryClient.removeQueries({ queryKey: ['stream-token'] });
      queryClient.removeQueries({ queryKey: ['federation'] });
      queryClient.invalidateQueries();
      setLocation('/login');
    },
    onError: () => {
      // Limpiar estado local aunque falle la API
      clearAuth();
      // Borrar solo queries que dependen del usuario autenticado.
      // Mantener cache de datos publicos (setup, server info) para
      // evitar re-fetch masivo si el usuario hace login de nuevo.
      queryClient.removeQueries({ queryKey: ['user'] });
      queryClient.removeQueries({ queryKey: ['admin'] });
      queryClient.removeQueries({ queryKey: ['playlists'] });
      queryClient.removeQueries({ queryKey: ['stream-token'] });
      queryClient.removeQueries({ queryKey: ['federation'] });
      queryClient.invalidateQueries();
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
