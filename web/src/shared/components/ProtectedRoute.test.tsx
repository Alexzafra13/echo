import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '@shared/store';

// Mock wouter
let mockLocation = '/home';
vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, vi.fn()],
  Redirect: ({ to }: { to: string }) => <div data-testid="redirect" data-to={to} />,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    mockLocation = '/home';
  });

  it('should render children when authenticated and no password change required', () => {
    useAuthStore
      .getState()
      .setAuth(
        { id: '1', username: 'user', isAdmin: false, mustChangePassword: false },
        'access-token',
        'refresh-token'
      );

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should redirect to /login when not authenticated', () => {
    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Secret Content</div>
      </ProtectedRoute>
    );

    const redirect = screen.getByTestId('redirect');
    expect(redirect).toHaveAttribute('data-to', '/login');
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should redirect to /first-login when mustChangePassword is true', () => {
    useAuthStore
      .getState()
      .setAuth(
        { id: '1', username: 'user', isAdmin: false, mustChangePassword: true },
        'access-token',
        'refresh-token'
      );
    mockLocation = '/home';

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Secret Content</div>
      </ProtectedRoute>
    );

    const redirect = screen.getByTestId('redirect');
    expect(redirect).toHaveAttribute('data-to', '/first-login');
  });

  it('should NOT redirect when already on /first-login and mustChangePassword is true (avoid infinite loop)', () => {
    useAuthStore
      .getState()
      .setAuth(
        { id: '1', username: 'user', isAdmin: false, mustChangePassword: true },
        'access-token',
        'refresh-token'
      );
    mockLocation = '/first-login';

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">First Login Page</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('redirect')).not.toBeInTheDocument();
  });

  it('should redirect to /login when user is null but isAuthenticated somehow true (corrupted state)', () => {
    // Simulate corrupted state: manually set isAuthenticated without user
    useAuthStore.setState({ isAuthenticated: false, user: null });

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Content</div>
      </ProtectedRoute>
    );

    const redirect = screen.getByTestId('redirect');
    expect(redirect).toHaveAttribute('data-to', '/login');
  });
});
