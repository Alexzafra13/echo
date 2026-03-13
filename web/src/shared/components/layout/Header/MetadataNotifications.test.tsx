import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MetadataNotifications } from './MetadataNotifications';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock state for notifications
const mockState = {
  notifications: [] as Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, unknown> | null;
  }>,
  unreadCount: 0,
};

const mockMarkAsRead = { mutate: vi.fn() };
const mockMarkAllAsRead = { mutate: vi.fn() };
const mockDeleteAll = { mutate: vi.fn() };
const mockClose = vi.fn((callback?: () => void) => callback?.());

vi.mock('@features/notifications', () => ({
  useNotificationsList: () => ({
    data: { notifications: mockState.notifications },
  }),
  useUnreadCount: () => ({
    data: { count: mockState.unreadCount },
  }),
  useMarkAsRead: () => mockMarkAsRead,
  useMarkAllAsRead: () => mockMarkAllAsRead,
  useDeleteAllNotifications: () => mockDeleteAll,
  useNotificationSSE: () => {},
}));

vi.mock('@shared/hooks', () => ({
  useClickOutside: () => ({
    ref: { current: null },
    isClosing: false,
    close: mockClose,
  }),
}));

// Mock API client
const mockGet = vi.fn();
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

describe('MetadataNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.notifications = [];
    mockState.unreadCount = 0;

    mockGet.mockResolvedValue({
      data: {
        systemHealth: { storage: 'ok', database: 'ok', redis: 'ok' },
        activeAlerts: {},
      },
    });
  });

  describe('Bell Button', () => {
    it('should render bell button', () => {
      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument();
    });

    it('should not show badge when no notifications', () => {
      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show badge with unread count', () => {
      mockState.unreadCount = 3;

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('should open dropdown on click', () => {
      render(<MetadataNotifications token="test-token" isAdmin={false} />);

      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    });

    it('should show empty state when no notifications', () => {
      render(<MetadataNotifications token="test-token" isAdmin={false} />);

      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('No hay notificaciones')).toBeInTheDocument();
    });
  });

  describe('Persistent Notifications', () => {
    it('should display friend request notifications', () => {
      mockState.notifications = [
        {
          id: 'n1',
          type: 'friend_request_received',
          title: 'Test User',
          message: 'te ha enviado una solicitud de amistad',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];
      mockState.unreadCount = 1;

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('te ha enviado una solicitud de amistad')).toBeInTheDocument();
    });

    it('should display enrichment notifications', () => {
      mockState.notifications = [
        {
          id: 'n2',
          type: 'enrichment_completed',
          title: 'Test Artist',
          message: 'Metadata enriquecida correctamente',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('Metadata enriquecida correctamente')).toBeInTheDocument();
    });

    it('should mark as read on click', () => {
      mockState.notifications = [
        {
          id: 'n1',
          type: 'friend_request_received',
          title: 'Test User',
          message: 'solicitud de amistad',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));
      fireEvent.click(screen.getByText('Test User'));

      expect(mockMarkAsRead.mutate).toHaveBeenCalledWith('n1');
    });

    it('should not mark already read notifications', () => {
      mockState.notifications = [
        {
          id: 'n1',
          type: 'friend_request_received',
          title: 'Test User',
          message: 'solicitud de amistad',
          isRead: true,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));
      fireEvent.click(screen.getByText('Test User'));

      expect(mockMarkAsRead.mutate).not.toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('should show mark all as read button when unread exist', () => {
      mockState.notifications = [
        {
          id: 'n1',
          type: 'enrichment_completed',
          title: 'Test',
          message: 'Done',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];
      mockState.unreadCount = 1;

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByTitle('Marcar todas como leidas')).toBeInTheDocument();
    });

    it('should call markAllAsRead when button clicked', () => {
      mockState.notifications = [
        {
          id: 'n1',
          type: 'enrichment_completed',
          title: 'Test',
          message: 'Done',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];
      mockState.unreadCount = 1;

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));
      fireEvent.click(screen.getByTitle('Marcar todas como leidas'));

      expect(mockMarkAllAsRead.mutate).toHaveBeenCalled();
    });

    it('should show clear all button', () => {
      mockState.notifications = [
        {
          id: 'n1',
          type: 'enrichment_completed',
          title: 'Test',
          message: 'Done',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByTitle('Limpiar todas')).toBeInTheDocument();
    });

    it('should call deleteAll when clear button clicked', () => {
      mockState.notifications = [
        {
          id: 'n1',
          type: 'enrichment_completed',
          title: 'Test',
          message: 'Done',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));
      fireEvent.click(screen.getByTitle('Limpiar todas'));

      expect(mockDeleteAll.mutate).toHaveBeenCalled();
    });
  });

  describe('Relative Time', () => {
    it('should show "Ahora mismo" for recent notifications', () => {
      mockState.notifications = [
        {
          id: 'n1',
          type: 'friend_request_received',
          title: 'Test',
          message: 'solicitud',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Ahora mismo')).toBeInTheDocument();
    });
  });

  describe('System Alerts (Admin)', () => {
    it('should fetch system alerts for admin', async () => {
      render(<MetadataNotifications token="test-token" isAdmin={true} />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/admin/dashboard/health');
      });
    });

    it('should not fetch system alerts for non-admin', () => {
      render(<MetadataNotifications token="test-token" isAdmin={false} />);

      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Notification Priority', () => {
    it('should show system alerts before persistent notifications for admin', () => {
      mockGet.mockResolvedValue({
        data: {
          systemHealth: { storage: 'ok', database: 'down', redis: 'ok' },
          activeAlerts: {},
        },
      });

      mockState.notifications = [
        {
          id: 'n1',
          type: 'enrichment_completed',
          title: 'Artist Name',
          message: 'Enrichment done',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      // Both should be present
      expect(screen.getByText('Artist Name')).toBeInTheDocument();
    });
  });
});
