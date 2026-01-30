import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FederationPanel } from './FederationPanel';

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

// Mock shared hooks
vi.mock('@shared/hooks', () => ({
  useModal: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    openWith: vi.fn(),
    data: null,
  }),
  useNotification: () => ({
    notification: null,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({ children, onClick, disabled, leftIcon }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {leftIcon}{children}
    </button>
  ),
  InlineNotification: ({ message, onDismiss }: any) => (
    <div data-testid="notification" onClick={onDismiss}>{message}</div>
  ),
  ConfirmDialog: () => null,
}));

// Mock sub-components
vi.mock('./ConnectServerModal', () => ({
  ConnectServerModal: () => <div data-testid="connect-modal">Connect Modal</div>,
}));

vi.mock('./CreateInvitationModal', () => ({
  CreateInvitationModal: () => <div data-testid="create-invitation-modal">Create Invitation Modal</div>,
}));

vi.mock('./ServerCard', () => ({
  ServerCard: ({ server, onSync, onDisconnect }: any) => (
    <div data-testid={`server-${server.id}`}>
      <span>{server.name}</span>
      <button onClick={() => onSync(server)}>Sync</button>
      <button onClick={() => onDisconnect(server)}>Disconnect</button>
    </div>
  ),
}));

vi.mock('./InvitationCard', () => ({
  InvitationCard: ({ invitation, onCopyToken, onDelete }: any) => (
    <div data-testid={`invitation-${invitation.id}`}>
      <span>{invitation.label}</span>
      <button onClick={() => onCopyToken(invitation.token)}>Copy</button>
      <button onClick={() => onDelete(invitation)}>Delete</button>
    </div>
  ),
}));

vi.mock('./AccessCard', () => ({
  AccessCard: ({ token, onRevoke, onReactivate, onDelete }: any) => (
    <div data-testid={`access-${token.id}`}>
      <span>{token.serverName}</span>
      <button onClick={() => onRevoke(token)}>Revoke</button>
      <button onClick={() => onReactivate(token)}>Reactivate</button>
      <button onClick={() => onDelete(token)}>Delete</button>
    </div>
  ),
}));

vi.mock('./MutualRequestsBanner', () => ({
  MutualRequestsBanner: ({ requests, onApprove, onReject }: any) => (
    requests.length > 0 ? (
      <div data-testid="mutual-requests">
        {requests.map((r: any) => (
          <div key={r.id}>
            <span>{r.serverName}</span>
            <button onClick={() => onApprove(r)}>Approve</button>
            <button onClick={() => onReject(r)}>Reject</button>
          </div>
        ))}
      </div>
    ) : null
  ),
}));

// Mock federation hooks
const mockServers = [
  { id: '1', name: 'Server Alpha', url: 'https://alpha.echo', status: 'online' },
  { id: '2', name: 'Server Beta', url: 'https://beta.echo', status: 'offline' },
];

const mockInvitations = [
  { id: 'inv1', token: 'abc123', label: 'For Friend', usedCount: 0 },
  { id: 'inv2', token: 'def456', label: 'Family', usedCount: 2 },
];

const mockAccessTokens = [
  { id: 'acc1', serverName: 'Friend Server', permissions: { canBrowse: true, canStream: true, canDownload: false }, status: 'active' },
];

const mockPendingRequests = [
  { id: 'req1', serverName: 'New Friend', permissions: {} },
];

const mockHooksState = {
  servers: mockServers,
  serversLoading: false,
  invitations: mockInvitations,
  invitationsLoading: false,
  accessTokens: mockAccessTokens,
  accessLoading: false,
  pendingRequests: [] as typeof mockPendingRequests,
};

vi.mock('../../hooks/useFederation', () => ({
  useConnectedServers: () => ({ data: mockHooksState.servers, isLoading: mockHooksState.serversLoading }),
  useInvitationTokens: () => ({ data: mockHooksState.invitations, isLoading: mockHooksState.invitationsLoading }),
  useAccessTokens: () => ({ data: mockHooksState.accessTokens, isLoading: mockHooksState.accessLoading }),
  usePendingMutualRequests: () => ({ data: mockHooksState.pendingRequests }),
  useDisconnectFromServer: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useSyncServer: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useDeleteInvitation: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useRevokeAccessToken: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useCheckAllServersHealth: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useApproveMutualRequest: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useRejectMutualRequest: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdatePermissions: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useDeleteAccessToken: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useReactivateAccessToken: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

describe('FederationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHooksState.servers = mockServers;
    mockHooksState.serversLoading = false;
    mockHooksState.invitations = mockInvitations;
    mockHooksState.invitationsLoading = false;
    mockHooksState.accessTokens = mockAccessTokens;
    mockHooksState.accessLoading = false;
    mockHooksState.pendingRequests = [];
  });

  describe('layout', () => {
    it('should render header', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Federación de Servidores')).toBeInTheDocument();
      expect(screen.getByText(/Conecta con otros servidores Echo/)).toBeInTheDocument();
    });

    it('should render tabs', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Servidores Conectados')).toBeInTheDocument();
      expect(screen.getByText('Mis Invitaciones')).toBeInTheDocument();
      expect(screen.getByText('Quién tiene acceso')).toBeInTheDocument();
    });

    it('should show servers tab by default', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Servidores a los que te has conectado')).toBeInTheDocument();
    });

    it('should show badge counts on tabs', () => {
      render(<FederationPanel />);

      // Multiple badges with count 2 (servers and invitations)
      const badges = screen.getAllByText('2');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('servers tab', () => {
    it('should render connected servers', () => {
      render(<FederationPanel />);

      expect(screen.getByTestId('server-1')).toBeInTheDocument();
      expect(screen.getByTestId('server-2')).toBeInTheDocument();
      expect(screen.getByText('Server Alpha')).toBeInTheDocument();
      expect(screen.getByText('Server Beta')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockHooksState.serversLoading = true;
      render(<FederationPanel />);

      expect(screen.getByText('Cargando servidores...')).toBeInTheDocument();
    });

    it('should show empty state when no servers', () => {
      mockHooksState.servers = [];
      render(<FederationPanel />);

      expect(screen.getByText('No hay servidores conectados')).toBeInTheDocument();
      expect(screen.getByText('Conecta con el servidor de un amigo para ver su biblioteca')).toBeInTheDocument();
    });

    it('should have connect server button', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Conectar Servidor')).toBeInTheDocument();
    });

    it('should have verify health button when servers exist', () => {
      render(<FederationPanel />);

      expect(screen.getByText('Verificar estado')).toBeInTheDocument();
    });
  });

  describe('invitations tab', () => {
    it('should switch to invitations tab', () => {
      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Mis Invitaciones'));

      expect(screen.getByText('Tokens de invitación')).toBeInTheDocument();
    });

    it('should render invitations', () => {
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));

      expect(screen.getByTestId('invitation-inv1')).toBeInTheDocument();
      expect(screen.getByTestId('invitation-inv2')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockHooksState.invitationsLoading = true;
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));

      expect(screen.getByText('Cargando invitaciones...')).toBeInTheDocument();
    });

    it('should show empty state when no invitations', () => {
      mockHooksState.invitations = [];
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));

      expect(screen.getByText('No hay invitaciones')).toBeInTheDocument();
    });

    it('should have create invitation button', () => {
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));

      expect(screen.getByText('Crear Invitación')).toBeInTheDocument();
    });
  });

  describe('access tab', () => {
    it('should switch to access tab', () => {
      render(<FederationPanel />);

      fireEvent.click(screen.getByText('Quién tiene acceso'));

      expect(screen.getByText('Servidores con acceso a tu biblioteca')).toBeInTheDocument();
    });

    it('should render access tokens', () => {
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Quién tiene acceso'));

      expect(screen.getByTestId('access-acc1')).toBeInTheDocument();
      expect(screen.getByText('Friend Server')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockHooksState.accessLoading = true;
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Quién tiene acceso'));

      // Use getAllByText since server name also shows "Cargando..." while loading
      const loadingElements = screen.getAllByText('Cargando...');
      expect(loadingElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should show empty state when no access tokens', () => {
      mockHooksState.accessTokens = [];
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Quién tiene acceso'));

      expect(screen.getByText('Nadie tiene acceso')).toBeInTheDocument();
    });
  });

  describe('mutual requests', () => {
    it('should show mutual requests banner when pending', () => {
      mockHooksState.pendingRequests = mockPendingRequests;
      render(<FederationPanel />);

      expect(screen.getByTestId('mutual-requests')).toBeInTheDocument();
      expect(screen.getByText('New Friend')).toBeInTheDocument();
    });

    it('should not show banner when no pending requests', () => {
      mockHooksState.pendingRequests = [];
      render(<FederationPanel />);

      expect(screen.queryByTestId('mutual-requests')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should copy token to clipboard', async () => {
      render(<FederationPanel />);
      fireEvent.click(screen.getByText('Mis Invitaciones'));

      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abc123');
      });
    });
  });
});
