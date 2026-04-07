import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminRoute } from './AdminRoute';
import { useAuthStore } from '@shared/store';

// Mock wouter
let mockLocation = '/admin';
vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, vi.fn()],
  Redirect: ({ to }: { to: string }) => <div data-testid="redirect" data-to={to} />,
}));

describe('AdminRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    mockLocation = '/admin';
  });

  it('should render children when user is admin and authenticated', () => {
    useAuthStore
      .getState()
      .setAuth(
        { id: '1', username: 'admin', isAdmin: true, mustChangePassword: false },
        'access-token',
        'refresh-token'
      );

    render(
      <AdminRoute>
        <div data-testid="admin-content">Admin Panel</div>
      </AdminRoute>
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('should redirect to /home when user is not admin', () => {
    useAuthStore
      .getState()
      .setAuth(
        { id: '1', username: 'user', isAdmin: false, mustChangePassword: false },
        'access-token',
        'refresh-token'
      );

    render(
      <AdminRoute>
        <div data-testid="admin-content">Admin Panel</div>
      </AdminRoute>
    );

    const redirect = screen.getByTestId('redirect');
    expect(redirect).toHaveAttribute('data-to', '/home');
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('should redirect to /login when not authenticated (via ProtectedRoute)', () => {
    render(
      <AdminRoute>
        <div data-testid="admin-content">Admin Panel</div>
      </AdminRoute>
    );

    const redirect = screen.getByTestId('redirect');
    expect(redirect).toHaveAttribute('data-to', '/login');
  });

  it('should not crash when user is null', () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });

    render(
      <AdminRoute>
        <div data-testid="admin-content">Admin Panel</div>
      </AdminRoute>
    );

    // Should redirect to login since not authenticated
    const redirect = screen.getByTestId('redirect');
    expect(redirect).toHaveAttribute('data-to', '/login');
  });
});
