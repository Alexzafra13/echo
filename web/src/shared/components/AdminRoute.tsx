import { Redirect, useLocation } from 'wouter';
import { useAuthStore } from '@shared/store';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const [location] = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Permitir acceso a /first-login para evitar loop infinito
  if (user?.mustChangePassword && location !== '/first-login') {
    return <Redirect to="/first-login" />;
  }

  const isAdmin = user?.isAdmin === true;

  if (!isAdmin) {
    return <Redirect to="/home" />;
  }

  return <>{children}</>;
}
