import { Redirect } from 'wouter';
import { useAuthStore } from '@shared/store';
import { ProtectedRoute } from './ProtectedRoute';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const user = useAuthStore((state) => state.user);

  return (
    <ProtectedRoute>
      {user?.isAdmin === true ? <>{children}</> : <Redirect to="/home" />}
    </ProtectedRoute>
  );
}
