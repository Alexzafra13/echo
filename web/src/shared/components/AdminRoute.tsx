import { Redirect, useLocation } from 'wouter';
import { useAuthStore } from '@shared/store';

/**
 * AdminRoute Component
 * Redirects to login if user is not authenticated
 * Redirects to first-login if user must change password
 * Redirects to home if user is not an admin
 */
interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
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

  // Check if user is admin
  const isAdmin = user?.isAdmin === true;

  if (!isAdmin) {
    // If not admin, redirect to home
    return <Redirect to="/home" />;
  }

  return <>{children}</>;
}
