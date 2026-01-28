import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MetadataNotifications } from './MetadataNotifications';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock state
const mockState = {
  metadataNotifications: [] as Array<{
    id: string;
    entityType: string;
    entityName: string;
    bioUpdated: boolean;
    imagesUpdated: boolean;
    coverUpdated: boolean;
    read: boolean;
    timestamp: string;
  }>,
  unreadCount: 0,
  pendingRequests: {
    received: [] as Array<{
      friendshipId: string;
      id: string;
      username: string;
      name: string | null;
    }>,
  },
};

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockClearAll = vi.fn();
const mockClose = vi.fn((callback?: () => void) => callback?.());

vi.mock('@shared/hooks', () => ({
  useMetadataEnrichment: () => ({
    notifications: mockState.metadataNotifications,
    unreadCount: mockState.unreadCount,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    clearAll: mockClearAll,
  }),
  useClickOutside: () => ({
    ref: { current: null },
    isClosing: false,
    close: mockClose,
  }),
}));

vi.mock('@features/social/hooks', () => ({
  usePendingRequests: () => ({
    data: mockState.pendingRequests,
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
    mockState.metadataNotifications = [];
    mockState.unreadCount = 0;
    mockState.pendingRequests = { received: [] };

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

    it('should show badge with friend request count', () => {
      mockState.pendingRequests = {
        received: [
          { friendshipId: 'f1', id: 'user-1', username: 'friend1', name: 'Friend One' },
        ],
      };

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show combined count for admin', () => {
      mockState.pendingRequests = {
        received: [
          { friendshipId: 'f1', id: 'user-1', username: 'friend1', name: 'Friend One' },
        ],
      };
      mockState.unreadCount = 2;

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      // 1 friend request + 2 metadata unread = 3
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

  describe('Friend Request Notifications', () => {
    it('should display friend request notifications', () => {
      mockState.pendingRequests = {
        received: [
          { friendshipId: 'f1', id: 'user-1', username: 'testuser', name: 'Test User' },
        ],
      };

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('te ha enviado una solicitud de amistad')).toBeInTheDocument();
    });

    it('should use username when name is null', () => {
      mockState.pendingRequests = {
        received: [
          { friendshipId: 'f1', id: 'user-1', username: 'testuser', name: null },
        ],
      };

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should navigate to social page on friend request click', () => {
      mockState.pendingRequests = {
        received: [
          { friendshipId: 'f1', id: 'user-1', username: 'testuser', name: 'Test User' },
        ],
      };

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));
      fireEvent.click(screen.getByText('Test User'));

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Metadata Notifications (Admin)', () => {
    it('should show metadata notifications for admin', () => {
      mockState.metadataNotifications = [
        {
          id: 'meta-1',
          entityType: 'artist',
          entityName: 'Test Artist',
          bioUpdated: true,
          imagesUpdated: false,
          coverUpdated: false,
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];
      mockState.unreadCount = 1;

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('biografía actualizado')).toBeInTheDocument();
    });

    it('should show multiple updates in message', () => {
      mockState.metadataNotifications = [
        {
          id: 'meta-1',
          entityType: 'album',
          entityName: 'Test Album',
          bioUpdated: false,
          imagesUpdated: true,
          coverUpdated: true,
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.getByText('imágenes, portada actualizado')).toBeInTheDocument();
    });

    it('should not show metadata notifications for non-admin', () => {
      mockState.metadataNotifications = [
        {
          id: 'meta-1',
          entityType: 'artist',
          entityName: 'Test Artist',
          bioUpdated: true,
          imagesUpdated: false,
          coverUpdated: false,
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={false} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.queryByText('Test Artist')).not.toBeInTheDocument();
    });
  });

  describe('Admin Actions', () => {
    it('should show mark all as read button for admin', () => {
      mockState.metadataNotifications = [
        {
          id: 'meta-1',
          entityType: 'artist',
          entityName: 'Test',
          bioUpdated: true,
          imagesUpdated: false,
          coverUpdated: false,
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];
      mockState.unreadCount = 1;

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByTitle('Marcar todas como leídas')).toBeInTheDocument();
    });

    it('should call markAllAsRead when button clicked', () => {
      mockState.metadataNotifications = [
        {
          id: 'meta-1',
          entityType: 'artist',
          entityName: 'Test',
          bioUpdated: true,
          imagesUpdated: false,
          coverUpdated: false,
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];
      mockState.unreadCount = 1;

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));
      fireEvent.click(screen.getByTitle('Marcar todas como leídas'));

      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });

    it('should show clear all button for admin', () => {
      mockState.metadataNotifications = [
        {
          id: 'meta-1',
          entityType: 'artist',
          entityName: 'Test',
          bioUpdated: true,
          imagesUpdated: false,
          coverUpdated: false,
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      expect(screen.getByTitle('Limpiar todas')).toBeInTheDocument();
    });

    it('should call clearAll when button clicked', () => {
      mockState.metadataNotifications = [
        {
          id: 'meta-1',
          entityType: 'artist',
          entityName: 'Test',
          bioUpdated: true,
          imagesUpdated: false,
          coverUpdated: false,
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));
      fireEvent.click(screen.getByTitle('Limpiar todas'));

      expect(mockClearAll).toHaveBeenCalled();
    });
  });

  describe('Relative Time', () => {
    it('should show "Ahora mismo" for recent notifications', () => {
      mockState.pendingRequests = {
        received: [
          { friendshipId: 'f1', id: 'user-1', username: 'test', name: 'Test' },
        ],
      };

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
    it('should show friend requests before metadata notifications', () => {
      mockState.pendingRequests = {
        received: [
          { friendshipId: 'f1', id: 'user-1', username: 'friend', name: 'Friend User' },
        ],
      };
      mockState.metadataNotifications = [
        {
          id: 'meta-1',
          entityType: 'artist',
          entityName: 'Artist Name',
          bioUpdated: true,
          imagesUpdated: false,
          coverUpdated: false,
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];

      render(<MetadataNotifications token="test-token" isAdmin={true} />);
      fireEvent.click(screen.getByRole('button', { name: /notificaciones/i }));

      const items = screen.getAllByText(/Friend User|Artist Name/);
      expect(items[0]).toHaveTextContent('Friend User');
    });
  });
});
