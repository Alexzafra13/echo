import { useState, useEffect } from 'react';
import { useModal, useNotification } from '@shared/hooks';
import { Server, Link2, Plus, Shield, Activity, Edit3, Check, X } from 'lucide-react';
import { Button, InlineNotification, ConfirmDialog } from '@shared/components/ui';
import { apiClient } from '@shared/services/api';
import {
  useConnectedServers,
  useInvitationTokens,
  useAccessTokens,
  useDeleteInvitation,
  useDisconnectFromServer,
  useSyncServer,
  useRevokeAccessToken,
  useDeleteAccessToken,
  useReactivateAccessToken,
  useCheckAllServersHealth,
  usePendingMutualRequests,
  useApproveMutualRequest,
  useRejectMutualRequest,
  useUpdatePermissions,
} from '../../hooks/useFederation';
import { ConnectedServer, InvitationToken, AccessToken } from '../../api/federation.api';
import { ConnectServerModal } from './ConnectServerModal';
import { CreateInvitationModal } from './CreateInvitationModal';
import { ServerCard } from './ServerCard';
import { InvitationCard } from './InvitationCard';
import { AccessCard } from './AccessCard';
import { MutualRequestsBanner } from './MutualRequestsBanner';
import styles from './FederationPanel.module.css';

/**
 * FederationPanel Component
 * Panel para gestionar conexiones con otros servidores Echo
 */
export function FederationPanel() {
  const [activeTab, setActiveTab] = useState<'servers' | 'invitations' | 'access'>('servers');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Server name editing state
  const [serverName, setServerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isLoadingName, setIsLoadingName] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);

  // Load server name on mount (auto-generates if not set)
  useEffect(() => {
    const loadServerName = async () => {
      try {
        const response = await apiClient.get('/admin/settings/federation/server-name');
        const data = response.data as { name: string; isDefault: boolean };
        setServerName(data.name);
      } catch {
        // Error loading server name
      } finally {
        setIsLoadingName(false);
      }
    };
    loadServerName();
  }, []);

  // Modal states using useModal hook
  const connectModal = useModal();
  const createInvitationModal = useModal();
  const disconnectModal = useModal<ConnectedServer>();
  const deleteInvitationModal = useModal<InvitationToken>();
  const revokeAccessModal = useModal<AccessToken>();
  const deleteAccessModal = useModal<AccessToken>();

  // Track which server is currently syncing (to avoid disabling all sync buttons)
  const [syncingServerId, setSyncingServerId] = useState<string | null>(null);

  // Notifications
  const { notification, showSuccess, showError, dismiss } = useNotification();

  // Queries
  const { data: servers, isLoading: serversLoading } = useConnectedServers();
  const { data: invitations, isLoading: invitationsLoading } = useInvitationTokens();
  const { data: accessTokens, isLoading: accessLoading } = useAccessTokens();
  const { data: pendingMutualRequests = [] } = usePendingMutualRequests();

  // Mutations
  const disconnectMutation = useDisconnectFromServer();
  const syncMutation = useSyncServer();
  const deleteInvitationMutation = useDeleteInvitation();
  const revokeAccessMutation = useRevokeAccessToken();
  const checkHealthMutation = useCheckAllServersHealth();
  const approveMutualMutation = useApproveMutualRequest();
  const rejectMutualMutation = useRejectMutualRequest();
  const updatePermissionsMutation = useUpdatePermissions();
  const deleteAccessMutation = useDeleteAccessToken();
  const reactivateAccessMutation = useReactivateAccessToken();

  // Server name handlers
  const handleStartEditName = () => {
    setEditedName(serverName);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleSaveServerName = async () => {
    if (!editedName.trim()) return;

    setIsSavingName(true);
    try {
      await apiClient.put('/admin/settings/server.name', { value: editedName.trim() });
      setServerName(editedName.trim());
      setIsEditingName(false);
      showSuccess('Nombre del servidor actualizado');
    } catch {
      showError('Error al guardar el nombre');
    } finally {
      setIsSavingName(false);
    }
  };

  // Handlers
  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      showError('Error al copiar el token');
    }
  };

  const handleSync = async (server: ConnectedServer) => {
    setSyncingServerId(server.id);
    try {
      await syncMutation.mutateAsync(server.id);
      showSuccess(`Sincronizado con ${server.name}`);
    } catch {
      showError('Error al sincronizar');
    } finally {
      setSyncingServerId(null);
    }
  };

  const handleCheckHealth = async () => {
    try {
      await checkHealthMutation.mutateAsync();
      showSuccess('Estado de servidores actualizado');
    } catch {
      showError('Error al verificar estado');
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectModal.data) return;
    try {
      await disconnectMutation.mutateAsync(disconnectModal.data.id);
      disconnectModal.close();
      showSuccess('Desconectado correctamente');
    } catch {
      showError('Error al desconectar');
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteInvitationModal.data) return;
    try {
      await deleteInvitationMutation.mutateAsync(deleteInvitationModal.data.id);
      deleteInvitationModal.close();
      showSuccess('Invitación eliminada');
    } catch {
      showError('Error al eliminar invitación');
    }
  };

  const handleRevokeAccess = async () => {
    if (!revokeAccessModal.data) return;
    try {
      await revokeAccessMutation.mutateAsync(revokeAccessModal.data.id);
      revokeAccessModal.close();
      showSuccess('Acceso revocado');
    } catch {
      showError('Error al revocar acceso');
    }
  };

  const handleDeleteAccess = async () => {
    if (!deleteAccessModal.data) return;
    try {
      await deleteAccessMutation.mutateAsync(deleteAccessModal.data.id);
      deleteAccessModal.close();
      showSuccess('Acceso eliminado permanentemente');
    } catch {
      showError('Error al eliminar acceso');
    }
  };

  const handleReactivateAccess = async (token: AccessToken) => {
    try {
      await reactivateAccessMutation.mutateAsync(token.id);
      showSuccess(`Acceso de "${token.serverName}" reactivado`);
    } catch {
      showError('Error al reactivar acceso');
    }
  };

  const handleApproveMutual = async (request: AccessToken) => {
    try {
      await approveMutualMutation.mutateAsync(request.id);
      showSuccess(`Conectado con ${request.serverName}`);
    } catch {
      showError('Error al aprobar solicitud');
    }
  };

  const handleRejectMutual = async (request: AccessToken) => {
    try {
      await rejectMutualMutation.mutateAsync(request.id);
      showSuccess('Solicitud rechazada');
    } catch {
      showError('Error al rechazar solicitud');
    }
  };

  const handleTogglePermission = async (
    token: AccessToken,
    permission: 'canBrowse' | 'canStream' | 'canDownload'
  ) => {
    try {
      await updatePermissionsMutation.mutateAsync({
        id: token.id,
        permissions: {
          [permission]: !token.permissions[permission],
        },
      });
      showSuccess('Permisos actualizados');
    } catch {
      showError('Error al actualizar permisos');
    }
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Federación de Servidores</h2>
          <p className={styles.description}>
            Conecta con otros servidores Echo para compartir bibliotecas musicales con amigos.
          </p>
        </div>
      </div>

      {/* Server Identity Card */}
      <div className={styles.serverIdentityCard}>
        <div className={styles.serverIdentityIcon}>
          <Server size={24} />
        </div>
        <div className={styles.serverIdentityInfo}>
          <span className={styles.serverIdentityLabel}>Tu servidor se identifica como:</span>
          {isLoadingName ? (
            <span className={styles.serverIdentityName}>Cargando...</span>
          ) : isEditingName ? (
            <div className={styles.serverNameEdit}>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className={styles.serverNameInput}
                placeholder="Nombre del servidor"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveServerName();
                  if (e.key === 'Escape') handleCancelEditName();
                }}
              />
              <button
                className={styles.serverNameSaveBtn}
                onClick={handleSaveServerName}
                disabled={isSavingName || !editedName.trim()}
                title="Guardar"
              >
                <Check size={16} />
              </button>
              <button
                className={styles.serverNameCancelBtn}
                onClick={handleCancelEditName}
                disabled={isSavingName}
                title="Cancelar"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className={styles.serverNameDisplay}>
              <span className={styles.serverIdentityName}>
                {serverName || 'Sin nombre configurado'}
              </span>
              <button
                className={styles.serverNameEditBtn}
                onClick={handleStartEditName}
                title="Editar nombre"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={dismiss}
          autoHideMs={3000}
        />
      )}

      {/* Pending Mutual Requests Banner */}
      <MutualRequestsBanner
        requests={pendingMutualRequests}
        onApprove={handleApproveMutual}
        onReject={handleRejectMutual}
        isApproving={approveMutualMutation.isPending}
        isRejecting={rejectMutualMutation.isPending}
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'servers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('servers')}
        >
          <Server size={18} />
          <span>Servidores Conectados</span>
          {servers && servers.length > 0 && (
            <span className={styles.tabBadge}>{servers.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'invitations' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('invitations')}
        >
          <Link2 size={18} />
          <span>Mis Invitaciones</span>
          {invitations && invitations.length > 0 && (
            <span className={styles.tabBadge}>{invitations.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'access' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('access')}
        >
          <Shield size={18} />
          <span>Quién tiene acceso</span>
          {accessTokens && accessTokens.length > 0 && (
            <span className={styles.tabBadge}>{accessTokens.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Servidores Conectados */}
        {activeTab === 'servers' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h3>Servidores a los que te has conectado</h3>
                <p>Estos son los servidores de amigos cuya biblioteca puedes ver.</p>
              </div>
              <div className={styles.headerActions}>
                {servers && servers.length > 0 && (
                  <Button
                    variant="secondary"
                    leftIcon={<Activity size={18} />}
                    onClick={handleCheckHealth}
                    disabled={checkHealthMutation.isPending}
                  >
                    {checkHealthMutation.isPending ? 'Verificando...' : 'Verificar estado'}
                  </Button>
                )}
                <Button
                  variant="primary"
                  leftIcon={<Plus size={18} />}
                  onClick={connectModal.open}
                >
                  Conectar Servidor
                </Button>
              </div>
            </div>

            {serversLoading ? (
              <div className={styles.loadingState}>Cargando servidores...</div>
            ) : servers && servers.length > 0 ? (
              <div className={styles.serverGrid}>
                {servers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    onSync={handleSync}
                    onDisconnect={(s) => disconnectModal.openWith(s)}
                    isSyncing={syncingServerId === server.id}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Server size={48} className={styles.emptyIcon} />
                <h3>No hay servidores conectados</h3>
                <p>Conecta con el servidor de un amigo para ver su biblioteca</p>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={18} />}
                  onClick={connectModal.open}
                >
                  Conectar Servidor
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Invitaciones */}
        {activeTab === 'invitations' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h3>Tokens de invitación</h3>
                <p>Comparte estos códigos con amigos para que se conecten a tu servidor.</p>
              </div>
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={createInvitationModal.open}
              >
                Crear Invitación
              </Button>
            </div>

            {invitationsLoading ? (
              <div className={styles.loadingState}>Cargando invitaciones...</div>
            ) : invitations && invitations.length > 0 ? (
              <div className={styles.invitationList}>
                {invitations.map((invitation) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    copiedToken={copiedToken}
                    onCopyToken={handleCopyToken}
                    onDelete={(inv) => deleteInvitationModal.openWith(inv)}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Link2 size={48} className={styles.emptyIcon} />
                <h3>No hay invitaciones</h3>
                <p>Crea un token de invitación para compartir tu biblioteca</p>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={18} />}
                  onClick={createInvitationModal.open}
                >
                  Crear Invitación
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Acceso */}
        {activeTab === 'access' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h3>Servidores con acceso a tu biblioteca</h3>
                <p>Estos servidores pueden ver y reproducir tu música.</p>
              </div>
            </div>

            {accessLoading ? (
              <div className={styles.loadingState}>Cargando...</div>
            ) : accessTokens && accessTokens.length > 0 ? (
              <div className={styles.accessList}>
                {accessTokens.map((token) => (
                  <AccessCard
                    key={token.id}
                    token={token}
                    onTogglePermission={handleTogglePermission}
                    onRevoke={(t) => revokeAccessModal.openWith(t)}
                    onReactivate={handleReactivateAccess}
                    onDelete={(t) => deleteAccessModal.openWith(t)}
                    isUpdatingPermissions={updatePermissionsMutation.isPending}
                    isReactivating={reactivateAccessMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Shield size={48} className={styles.emptyIcon} />
                <h3>Nadie tiene acceso</h3>
                <p>Cuando alguien use tu invitación, aparecerá aquí</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {connectModal.isOpen && (
        <ConnectServerModal
          onClose={connectModal.close}
          onSuccess={() => {
            connectModal.close();
            showSuccess('Conectado correctamente');
          }}
        />
      )}

      {createInvitationModal.isOpen && (
        <CreateInvitationModal
          onClose={createInvitationModal.close}
          onSuccess={() => {
            createInvitationModal.close();
            showSuccess('Invitación creada');
          }}
        />
      )}

      {disconnectModal.isOpen && disconnectModal.data && (
        <ConfirmDialog
          title="Desconectar servidor"
          message={`¿Estás seguro de que quieres desconectar de "${disconnectModal.data.name}"? Ya no podrás ver su biblioteca.`}
          confirmText="Desconectar"
          onConfirm={handleDisconnect}
          onCancel={disconnectModal.close}
          isLoading={disconnectMutation.isPending}
        />
      )}

      {deleteInvitationModal.isOpen && deleteInvitationModal.data && (
        <ConfirmDialog
          title="Eliminar invitación"
          message="¿Estás seguro de que quieres eliminar esta invitación? Los servidores que ya la usaron mantendrán el acceso."
          confirmText="Eliminar"
          onConfirm={handleDeleteInvitation}
          onCancel={deleteInvitationModal.close}
          isLoading={deleteInvitationMutation.isPending}
        />
      )}

      {revokeAccessModal.isOpen && revokeAccessModal.data && (
        <ConfirmDialog
          title="Revocar acceso"
          message={`¿Estás seguro de que quieres revocar el acceso de "${revokeAccessModal.data.serverName}"? Ya no podrán ver ni reproducir tu música.`}
          confirmText="Revocar"
          onConfirm={handleRevokeAccess}
          onCancel={revokeAccessModal.close}
          isLoading={revokeAccessMutation.isPending}
        />
      )}

      {deleteAccessModal.isOpen && deleteAccessModal.data && (
        <ConfirmDialog
          title="Eliminar acceso permanentemente"
          message={`¿Estás seguro de que quieres eliminar permanentemente el acceso de "${deleteAccessModal.data.serverName}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          onConfirm={handleDeleteAccess}
          onCancel={deleteAccessModal.close}
          isLoading={deleteAccessMutation.isPending}
        />
      )}
    </div>
  );
}
