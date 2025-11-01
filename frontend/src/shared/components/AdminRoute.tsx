import { Redirect } from 'wouter';
import { useAuthStore } from '@shared/store';

/**
 * AdminRoute Component
 * Redirects to home if user is not authenticated or not an admin
 */
interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Check if user is admin
  const isAdmin = user?.isAdmin === true;

  if (!isAdmin) {
    // If not admin, redirect to home
    return <Redirect to="/home" />;
  }

  return <>{children}</>;
}
