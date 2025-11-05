import { Redirect, useLocation } from 'wouter';
import { useAuthStore } from '@shared/store';

/**
 * ProtectedRoute Component
 * Redirects to login if user is not authenticated
 * Redirects to first-login if user must change password
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [location] = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Must change password -> redirect to first-login
  // (but allow access to /first-login itself to avoid infinite loop)
  if (user?.mustChangePassword && location !== '/first-login') {
    return <Redirect to="/first-login" />;
  }

  return <>{children}</>;
}
