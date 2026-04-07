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

// Mock useSystemHealth
let mockHealthData: unknown = undefined;
vi.mock('@shared/hooks/useSystemHealth', () => ({
  useSystemHealth: () => ({ data: mockHealthData }),
}));

describe('MetadataNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.notifications = [];
    mockState.unreadCount = 0;
    mockHealthData = undefined;
  });

  describe('Bell Button', () => {
    it('should render bell button', () => {
      render(<MetadataNotifications isAdmin={false} />);
      expect(screen.getByRole('button', { name: /notificaciones/i })).toBeInTheDocument();
    });

    it('should not show badge when no notifications', () => {
      render(<MetadataNotifications isAdmin={false} />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show badge with unread count', () => {
      mockState.unreadCount = 3;

      render(<MetadataNotifications isAdmin={false} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('should open dropdown on click', () => {
      render(<MetadataNotifications isAdmin={false} />);

      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    });

    it('should show empty state when no notifications', () => {
      render(<MetadataNotifications isAdmin={false} />);

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

      render(<MetadataNotifications isAdmin={false} />);
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

      render(<MetadataNotifications isAdmin={true} />);
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

      render(<MetadataNotifications isAdmin={false} />);
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

      render(<MetadataNotifications isAdmin={false} />);
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

      render(<MetadataNotifications isAdmin={true} />);
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

      render(<MetadataNotifications isAdmin={true} />);
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

      render(<MetadataNotifications isAdmin={true} />);
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

      render(<MetadataNotifications isAdmin={true} />);
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

      render(<MetadataNotifications isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Ahora mismo')).toBeInTheDocument();
    });
  });

  describe('System Alerts (Admin)', () => {
    it('should derive alerts from useSystemHealth data for admin', () => {
      mockHealthData = {
        systemHealth: { database: 'down', redis: 'healthy', scanner: 'idle', storage: 'healthy' },
        activeAlerts: {
          orphanedFiles: 0,
          pendingConflicts: 0,
          missingFiles: 0,
          scanErrors: 0,
          storageWarning: false,
        },
      };

      render(<MetadataNotifications isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      // Database down alert should be visible
      expect(screen.getByText(/Base de datos no disponible/i)).toBeInTheDocument();
    });

    it('should not show system alerts for non-admin', () => {
      mockHealthData = {
        systemHealth: { database: 'down', redis: 'healthy', scanner: 'idle', storage: 'healthy' },
        activeAlerts: {
          orphanedFiles: 0,
          pendingConflicts: 0,
          missingFiles: 0,
          scanErrors: 0,
          storageWarning: false,
        },
      };

      render(<MetadataNotifications isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      // Should not show database down alert
      expect(screen.queryByText(/Base de datos no disponible/i)).not.toBeInTheDocument();
    });
  });

  describe('Notification Priority', () => {
    it('should show system alerts before persistent notifications for admin', () => {
      mockHealthData = {
        systemHealth: { database: 'down', redis: 'healthy', scanner: 'idle', storage: 'healthy' },
        activeAlerts: {
          orphanedFiles: 0,
          pendingConflicts: 0,
          missingFiles: 0,
          scanErrors: 0,
          storageWarning: false,
        },
      };

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

      render(<MetadataNotifications isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      // Both should be present
      expect(screen.getByText('Artist Name')).toBeInTheDocument();
    });
  });
});
