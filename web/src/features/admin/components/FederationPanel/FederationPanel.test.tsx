import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FederationPanel } from './FederationPanel';
import * as federationHooks from '../../hooks/useFederation';

// Mock the federation hooks
vi.mock('../../hooks/useFederation');

// Mock the child modal components to avoid needing to mock their internal hooks
vi.mock('./ConnectServerModal', () => ({
  ConnectServerModal: ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => (
    <div data-testid="connect-server-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Connect Success</button>
    </div>
  ),
}));

vi.mock('./CreateInvitationModal', () => ({
  CreateInvitationModal: ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => (
    <div data-testid="create-invitation-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Create Success</button>
    </div>
  ),
}));

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock data
const mockServers = [
  {
    id: '1',
    name: 'Server Alpha',
    baseUrl: 'https://alpha.example.com',
    isOnline: true,
    remoteAlbumCount: 1500,
    remoteTrackCount: 25000,
    remoteArtistCount: 500,
    lastError: null,
    lastOnlineAt: null,
    lastSyncAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Server Beta',
    baseUrl: 'https://beta.example.com',
    isOnline: false,
    remoteAlbumCount: 800,
    remoteTrackCount: 12000,
    remoteArtistCount: 200,
    lastError: 'Connection timeout',
    lastOnlineAt: '2024-01-10T08:00:00Z',
    lastSyncAt: '2024-01-09T12:00:00Z',
  },
];

const mockInvitations = [
  {
    id: 'inv1',
    token: 'ABC123XYZ',
    name: 'Para Juan',
    isUsed: false,
    currentUses: 0,
    maxUses: 1,
    expiresAt: '2025-12-31T23:59:59Z',
  },
  {
    id: 'inv2',
    token: 'DEF456UVW',
    name: null,
    isUsed: true,
    currentUses: 1,
    maxUses: 1,
    expiresAt: '2024-06-30T23:59:59Z',
  },
];

const mockAccessTokens = [
  {
    id: 'acc1',
    serverName: 'Remote Server 1',
    serverUrl: 'https://remote1.example.com',
    isActive: true,
    permissions: { canBrowse: true, canStream: true, canDownload: false },
    lastUsedAt: '2024-01-20T15:00:00Z',
  },
  {
    id: 'acc2',
    serverName: 'Remote Server 2',
    serverUrl: 'https://remote2.example.com',
    isActive: false,
    permissions: { canBrowse: true, canStream: false, canDownload: false },
    lastUsedAt: null,
  },
];

const mockPendingRequests = [
  {
    id: 'req1',
    serverName: 'New Server',
    serverUrl: 'https://new.example.com',
    isActive: false,
    permissions: { canBrowse: false, canStream: false, canDownload: false },
  },
];

// Helper to create mock mutation
const createMockMutation = (overrides = {}) => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
  ...overrides,
});

describe('FederationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(federationHooks.useConnectedServers).mockReturnValue({
      data: mockServers,
      isLoading: false,
    } as ReturnType<typeof federationHooks.useConnectedServers>);

    vi.mocked(federationHooks.useInvitationTokens).mockReturnValue({
      data: mockInvitations,
      isLoading: false,
    } as ReturnType<typeof federationHooks.useInvitationTokens>);

    vi.mocked(federationHooks.useAccessTokens).mockReturnValue({
      data: mockAccessTokens,
      isLoading: false,
    } as ReturnType<typeof federationHooks.useAccessTokens>);

    vi.mocked(federationHooks.usePendingMutualRequests).mockReturnValue({
      data: [],
    } as ReturnType<typeof federationHooks.usePendingMutualRequests>);

    // Setup mutation mocks
    vi.mocked(federationHooks.useDisconnectFromServer).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useDisconnectFromServer>);
    vi.mocked(federationHooks.useSyncServer).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useSyncServer>);
    vi.mocked(federationHooks.useDeleteInvitation).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useDeleteInvitation>);
    vi.mocked(federationHooks.useRevokeAccessToken).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useRevokeAccessToken>);
    vi.mocked(federationHooks.useDeleteAccessToken).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useDeleteAccessToken>);
    vi.mocked(federationHooks.useReactivateAccessToken).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useReactivateAccessToken>);
    vi.mocked(federationHooks.useCheckAllServersHealth).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useCheckAllServersHealth>);
    vi.mocked(federationHooks.useApproveMutualRequest).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useApproveMutualRequest>);
    vi.mocked(federationHooks.useRejectMutualRequest).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useRejectMutualRequest>);
    vi.mocked(federationHooks.useUpdatePermissions).mockReturnValue(createMockMutation() as ReturnType<typeof federationHooks.useUpdatePermissions>);
  });

  describe('rendering', () => {
    it('should render the panel header', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Federación de Servidores')).toBeInTheDocument();
      expect(screen.getByText(/Conecta con otros servidores Echo/)).toBeInTheDocument();
    });

    it('should render all three tabs', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Servidores Conectados')).toBeInTheDocument();
      expect(screen.getByText('Mis Invitaciones')).toBeInTheDocument();
      expect(screen.getByText('Quién tiene acceso')).toBeInTheDocument();
    });

    it('should show badge counts on tabs', () => {
      render(<FederationPanel />);

      // Should show count badges
      const badges = screen.getAllByText('2');
      expect(badges.length).toBeGreaterThanOrEqual(2); // servers and access tokens both have 2
    });

    it('should show servers tab by default', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Servidores a los que te has conectado')).toBeInTheDocument();
      expect(screen.getByText('Server Alpha')).toBeInTheDocument();
      expect(screen.getByText('Server Beta')).toBeInTheDocument();
    });
  });

  describe('tabs navigation', () => {
    it('should switch to invitations tab', () => {
      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Mis Invitaciones'));

      expect(screen.getByText('Tokens de invitación')).toBeInTheDocument();
      expect(screen.getByText('ABC123XYZ')).toBeInTheDocument();
    });

    it('should switch to access tab', () => {
      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Quién tiene acceso'));

      expect(screen.getByText('Servidores con acceso a tu biblioteca')).toBeInTheDocument();
      expect(screen.getByText('Remote Server 1')).toBeInTheDocument();
    });

    it('should switch back to servers tab', () => {
      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Mis Invitaciones'));
      fireEvent.click(screen.getByText('Servidores Conectados'));

      expect(screen.getByText('Server Alpha')).toBeInTheDocument();
    });
  });

  describe('servers tab', () => {
    it('should show online/offline status', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should show server error message', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      vi.mocked(federationHooks.useConnectedServers).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof federationHooks.useConnectedServers>);

      render(<FederationPanel />);

      expect(screen.getByText('Cargando servidores...')).toBeInTheDocument();
    });

    it('should show empty state when no servers', () => {
      vi.mocked(federationHooks.useConnectedServers).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof federationHooks.useConnectedServers>);

      render(<FederationPanel />);

      expect(screen.getByText('No hay servidores conectados')).toBeInTheDocument();
    });

    it('should call sync mutation when sync button clicked', async () => {
      const syncMutation = createMockMutation();
      vi.mocked(federationHooks.useSyncServer).mockReturnValue(syncMutation as ReturnType<typeof federationHooks.useSyncServer>);

      render(<FederationPanel />);

      const syncButtons = screen.getAllByTitle('Sincronizar');
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(syncMutation.mutateAsync).toHaveBeenCalledWith('1');
      });
    });

    it('should call check health when button clicked', async () => {
      const healthMutation = createMockMutation();
      vi.mocked(federationHooks.useCheckAllServersHealth).mockReturnValue(healthMutation as ReturnType<typeof federationHooks.useCheckAllServersHealth>);

      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Verificar estado'));

      await waitFor(() => {
        expect(healthMutation.mutateAsync).toHaveBeenCalled();
      });
    });

    it('should open disconnect confirm dialog', () => {
      render(<FederationPanel />);

      const disconnectButtons = screen.getAllByTitle('Desconectar');
      fireEvent.click(disconnectButtons[0]);

      expect(screen.getByText('Desconectar servidor')).toBeInTheDocument();
      expect(screen.getByText(/¿Estás seguro de que quieres desconectar de "Server Alpha"/)).toBeInTheDocument();
    });

    it('should call disconnect mutation when confirmed', async () => {
      const disconnectMutation = createMockMutation();
      vi.mocked(federationHooks.useDisconnectFromServer).mockReturnValue(disconnectMutation as ReturnType<typeof federationHooks.useDisconnectFromServer>);

      render(<FederationPanel />);

      const disconnectButtons = screen.getAllByTitle('Desconectar');
      fireEvent.click(disconnectButtons[0]);

      fireEvent.click(screen.getByText('Desconectar'));

      await waitFor(() => {
        expect(disconnectMutation.mutateAsync).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('invitations tab', () => {
    const renderAndNavigateToInvitations = () => {
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));
    };

    it('should show invitation tokens', () => {
      renderAndNavigateToInvitations();
      expect(screen.getByText('ABC123XYZ')).toBeInTheDocument();
      expect(screen.getByText('DEF456UVW')).toBeInTheDocument();
    });

    it('should show invitation name if present', () => {
      renderAndNavigateToInvitations();
      expect(screen.getByText('Para Juan')).toBeInTheDocument();
    });

    it('should show active/used badges', () => {
      renderAndNavigateToInvitations();
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Usado')).toBeInTheDocument();
    });

    it('should copy token to clipboard', async () => {
      renderAndNavigateToInvitations();
      const copyButtons = screen.getAllByTitle('Copiar token');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith('ABC123XYZ');
      });
    });

    it('should open delete invitation dialog', () => {
      renderAndNavigateToInvitations();
      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Eliminar invitación')).toBeInTheDocument();
    });

    it('should call delete mutation when confirmed', async () => {
      const deleteMutation = createMockMutation();
      vi.mocked(federationHooks.useDeleteInvitation).mockReturnValue(deleteMutation as ReturnType<typeof federationHooks.useDeleteInvitation>);

      renderAndNavigateToInvitations();

      const deleteButtons = screen.getAllByText('Eliminar');
      fireEvent.click(deleteButtons[0]);

      // Click confirm in dialog
      const confirmButtons = screen.getAllByText('Eliminar');
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(deleteMutation.mutateAsync).toHaveBeenCalledWith('inv1');
      });
    });

    it('should show empty state when no invitations', () => {
      // Override mock before render
      vi.mocked(federationHooks.useInvitationTokens).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof federationHooks.useInvitationTokens>);

      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));

      expect(screen.getByText('No hay invitaciones')).toBeInTheDocument();
    });
  });

  describe('access tab', () => {
    const renderAndNavigateToAccess = () => {
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Quién tiene acceso'));
    };

    it('should show access tokens', () => {
      renderAndNavigateToAccess();
      expect(screen.getByText('Remote Server 1')).toBeInTheDocument();
      expect(screen.getByText('Remote Server 2')).toBeInTheDocument();
    });

    it('should show active/revoked badges', () => {
      renderAndNavigateToAccess();
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Revocado')).toBeInTheDocument();
    });

    it('should show permission buttons', () => {
      renderAndNavigateToAccess();
      expect(screen.getAllByText('Ver biblioteca').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Reproducir').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Descargar').length).toBeGreaterThanOrEqual(1);
    });

    it('should call update permissions when toggled', async () => {
      const updateMutation = createMockMutation();
      vi.mocked(federationHooks.useUpdatePermissions).mockReturnValue(updateMutation as ReturnType<typeof federationHooks.useUpdatePermissions>);

      renderAndNavigateToAccess();

      const downloadButtons = screen.getAllByText('Descargar');
      fireEvent.click(downloadButtons[0]);

      await waitFor(() => {
        expect(updateMutation.mutateAsync).toHaveBeenCalledWith({
          id: 'acc1',
          permissions: { canDownload: true },
        });
      });
    });

    it('should open revoke dialog for active token', () => {
      renderAndNavigateToAccess();
      const revokeButtons = screen.getAllByText('Revocar acceso');
      fireEvent.click(revokeButtons[0]);

      expect(screen.getByText(/¿Estás seguro de que quieres revocar/)).toBeInTheDocument();
    });

    it('should show reactivate button for revoked token', () => {
      renderAndNavigateToAccess();
      expect(screen.getByText('Reactivar')).toBeInTheDocument();
    });

    it('should call reactivate mutation', async () => {
      const reactivateMutation = createMockMutation();
      vi.mocked(federationHooks.useReactivateAccessToken).mockReturnValue(reactivateMutation as ReturnType<typeof federationHooks.useReactivateAccessToken>);

      renderAndNavigateToAccess();

      fireEvent.click(screen.getByText('Reactivar'));

      await waitFor(() => {
        expect(reactivateMutation.mutateAsync).toHaveBeenCalledWith('acc2');
      });
    });

    it('should show empty state when no access tokens', () => {
      // Override mock before render
      vi.mocked(federationHooks.useAccessTokens).mockReturnValue({
        data: [],
        isLoading: false,
      } as ReturnType<typeof federationHooks.useAccessTokens>);

      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Quién tiene acceso'));

      expect(screen.getByText('Nadie tiene acceso')).toBeInTheDocument();
    });
  });

  describe('pending mutual requests', () => {
    it('should show banner when there are pending requests', () => {
      vi.mocked(federationHooks.usePendingMutualRequests).mockReturnValue({
        data: mockPendingRequests,
      } as ReturnType<typeof federationHooks.usePendingMutualRequests>);

      render(<FederationPanel />);

      expect(screen.getByText('1 servidor quiere conectarse contigo')).toBeInTheDocument();
      expect(screen.getByText('New Server')).toBeInTheDocument();
    });

    it('should show plural text for multiple requests', () => {
      vi.mocked(federationHooks.usePendingMutualRequests).mockReturnValue({
        data: [...mockPendingRequests, { ...mockPendingRequests[0], id: 'req2', serverName: 'Another Server' }],
      } as ReturnType<typeof federationHooks.usePendingMutualRequests>);

      render(<FederationPanel />);

      expect(screen.getByText('2 servidores quieren conectarse contigo')).toBeInTheDocument();
    });

    it('should call approve mutation when accepted', async () => {
      const approveMutation = createMockMutation();
      vi.mocked(federationHooks.useApproveMutualRequest).mockReturnValue(approveMutation as ReturnType<typeof federationHooks.useApproveMutualRequest>);
      vi.mocked(federationHooks.usePendingMutualRequests).mockReturnValue({
        data: mockPendingRequests,
      } as ReturnType<typeof federationHooks.usePendingMutualRequests>);

      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Aceptar'));

      await waitFor(() => {
        expect(approveMutation.mutateAsync).toHaveBeenCalledWith('req1');
      });
    });

    it('should call reject mutation when rejected', async () => {
      const rejectMutation = createMockMutation();
      vi.mocked(federationHooks.useRejectMutualRequest).mockReturnValue(rejectMutation as ReturnType<typeof federationHooks.useRejectMutualRequest>);
      vi.mocked(federationHooks.usePendingMutualRequests).mockReturnValue({
        data: mockPendingRequests,
      } as ReturnType<typeof federationHooks.usePendingMutualRequests>);

      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Rechazar'));

      await waitFor(() => {
        expect(rejectMutation.mutateAsync).toHaveBeenCalledWith('req1');
      });
    });
  });

  describe('notifications', () => {
    it('should show success notification after sync', async () => {
      const syncMutation = createMockMutation();
      vi.mocked(federationHooks.useSyncServer).mockReturnValue(syncMutation as ReturnType<typeof federationHooks.useSyncServer>);

      render(<FederationPanel />);

      const syncButtons = screen.getAllByTitle('Sincronizar');
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Sincronizado con Server Alpha')).toBeInTheDocument();
      });
    });

    it('should show error notification when sync fails', async () => {
      const syncMutation = createMockMutation({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      vi.mocked(federationHooks.useSyncServer).mockReturnValue(syncMutation as ReturnType<typeof federationHooks.useSyncServer>);

      render(<FederationPanel />);

      const syncButtons = screen.getAllByTitle('Sincronizar');
      fireEvent.click(syncButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error al sincronizar')).toBeInTheDocument();
      });
    });
  });

  describe('modals', () => {
    it('should open connect server modal', () => {
      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Conectar Servidor'));

      // The mocked modal should be rendered
      expect(screen.getByTestId('connect-server-modal')).toBeInTheDocument();
    });

    it('should close connect server modal and show notification on success', async () => {
      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Conectar Servidor'));
      expect(screen.getByTestId('connect-server-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Connect Success'));

      await waitFor(() => {
        expect(screen.queryByTestId('connect-server-modal')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Conectado correctamente')).toBeInTheDocument();
    });

    it('should open create invitation modal', () => {
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));

      fireEvent.click(screen.getByText('Crear Invitación'));

      expect(screen.getByTestId('create-invitation-modal')).toBeInTheDocument();
    });

    it('should close create invitation modal and show notification on success', async () => {
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));
      fireEvent.click(screen.getByText('Crear Invitación'));

      fireEvent.click(screen.getByText('Create Success'));

      await waitFor(() => {
        expect(screen.queryByTestId('create-invitation-modal')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Invitación creada')).toBeInTheDocument();
    });

    it('should close disconnect dialog when cancelled', () => {
      render(<FederationPanel />);

      const disconnectButtons = screen.getAllByTitle('Desconectar');
      fireEvent.click(disconnectButtons[0]);

      expect(screen.getByText('Desconectar servidor')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancelar'));

      expect(screen.queryByText('Desconectar servidor')).not.toBeInTheDocument();
    });
  });
});
