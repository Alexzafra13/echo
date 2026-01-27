import { useState } from 'react';
import { useModal } from '@shared/hooks';
import {
  Server,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Users,
  Disc3,
  Music,
  Eye,
  Download,
  Radio,
  Shield,
  Wifi,
  WifiOff,
  Activity,
  Bell,
  X,
  UserPlus,
  RotateCcw,
} from 'lucide-react';
import { Button, InlineNotification, ConfirmDialog } from '@shared/components/ui';
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
import { formatDistanceToNow } from '@shared/utils/format';
import styles from './FederationPanel.module.css';
import type { NotificationType } from '@shared/components/ui';

/**
 * FederationPanel Component
 * Panel para gestionar conexiones con otros servidores Echo
 */
export function FederationPanel() {
  const [activeTab, setActiveTab] = useState<'servers' | 'invitations' | 'access'>('servers');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modal states using useModal hook
  const connectModal = useModal();
  const createInvitationModal = useModal();
  const disconnectModal = useModal<ConnectedServer>();
  const deleteInvitationModal = useModal<InvitationToken>();
  const revokeAccessModal = useModal<AccessToken>();
  const deleteAccessModal = useModal<AccessToken>();

  // Notifications
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

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

  // Handlers
  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      setNotification({ type: 'error', message: 'Error al copiar el token' });
    }
  };

  const handleSync = async (server: ConnectedServer) => {
    try {
      await syncMutation.mutateAsync(server.id);
      setNotification({ type: 'success', message: `Sincronizado con ${server.name}` });
    } catch {
      setNotification({ type: 'error', message: 'Error al sincronizar' });
    }
  };

  const handleCheckHealth = async () => {
    try {
      await checkHealthMutation.mutateAsync();
      setNotification({ type: 'success', message: 'Estado de servidores actualizado' });
    } catch {
      setNotification({ type: 'error', message: 'Error al verificar estado' });
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectModal.data) return;
    try {
      await disconnectMutation.mutateAsync(disconnectModal.data.id);
      disconnectModal.close();
      setNotification({ type: 'success', message: 'Desconectado correctamente' });
    } catch {
      setNotification({ type: 'error', message: 'Error al desconectar' });
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteInvitationModal.data) return;
    try {
      await deleteInvitationMutation.mutateAsync(deleteInvitationModal.data.id);
      deleteInvitationModal.close();
      setNotification({ type: 'success', message: 'Invitación eliminada' });
    } catch {
      setNotification({ type: 'error', message: 'Error al eliminar invitación' });
    }
  };

  const handleRevokeAccess = async () => {
    if (!revokeAccessModal.data) return;
    try {
      await revokeAccessMutation.mutateAsync(revokeAccessModal.data.id);
      revokeAccessModal.close();
      setNotification({ type: 'success', message: 'Acceso revocado' });
    } catch {
      setNotification({ type: 'error', message: 'Error al revocar acceso' });
    }
  };

  const handleDeleteAccess = async () => {
    if (!deleteAccessModal.data) return;
    try {
      await deleteAccessMutation.mutateAsync(deleteAccessModal.data.id);
      deleteAccessModal.close();
      setNotification({ type: 'success', message: 'Acceso eliminado permanentemente' });
    } catch {
      setNotification({ type: 'error', message: 'Error al eliminar acceso' });
    }
  };

  const handleReactivateAccess = async (token: AccessToken) => {
    try {
      await reactivateAccessMutation.mutateAsync(token.id);
      setNotification({ type: 'success', message: `Acceso de "${token.serverName}" reactivado` });
    } catch {
      setNotification({ type: 'error', message: 'Error al reactivar acceso' });
    }
  };

  const handleApproveMutual = async (request: AccessToken) => {
    try {
      await approveMutualMutation.mutateAsync(request.id);
      setNotification({ type: 'success', message: `Conectado con ${request.serverName}` });
    } catch {
      setNotification({ type: 'error', message: 'Error al aprobar solicitud' });
    }
  };

  const handleRejectMutual = async (request: AccessToken) => {
    try {
      await rejectMutualMutation.mutateAsync(request.id);
      setNotification({ type: 'success', message: 'Solicitud rechazada' });
    } catch {
      setNotification({ type: 'error', message: 'Error al rechazar solicitud' });
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
      setNotification({ type: 'success', message: 'Permisos actualizados' });
    } catch {
      setNotification({ type: 'error', message: 'Error al actualizar permisos' });
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0';
    const k = 1024;
    const sizes = ['', 'K', 'M', 'G'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
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

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
          autoHideMs={3000}
        />
      )}

      {/* Pending Mutual Requests Banner */}
      {pendingMutualRequests.length > 0 && (
        <div className={styles.mutualRequestsBanner}>
          <div className={styles.mutualRequestsHeader}>
            <Bell size={20} />
            <span>
              {pendingMutualRequests.length === 1
                ? '1 servidor quiere conectarse contigo'
                : `${pendingMutualRequests.length} servidores quieren conectarse contigo`}
            </span>
          </div>
          <div className={styles.mutualRequestsList}>
            {pendingMutualRequests.map((request) => (
              <div key={request.id} className={styles.mutualRequestCard}>
                <div className={styles.mutualRequestInfo}>
                  <UserPlus size={18} />
                  <div>
                    <strong>{request.serverName}</strong>
                    {request.serverUrl && (
                      <span className={styles.mutualRequestUrl}>{request.serverUrl}</span>
                    )}
                  </div>
                </div>
                <div className={styles.mutualRequestActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Check size={14} />}
                    onClick={() => handleApproveMutual(request)}
                    disabled={approveMutualMutation.isPending}
                  >
                    Aceptar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<X size={14} />}
                    onClick={() => handleRejectMutual(request)}
                    disabled={rejectMutualMutation.isPending}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <div key={server.id} className={styles.serverCard}>
                    <div className={styles.serverHeader}>
                      <div className={styles.serverIcon}>
                        <Server size={24} />
                      </div>
                      <div className={styles.serverInfo}>
                        <h4 className={styles.serverName}>{server.name}</h4>
                        <span className={styles.serverUrl}>{server.baseUrl}</span>
                      </div>
                      <span className={`${styles.serverStatus} ${server.isOnline ? styles.statusOnline : styles.statusOffline}`}>
                        {server.isOnline ? (
                          <>
                            <Wifi size={14} />
                            Online
                          </>
                        ) : (
                          <>
                            <WifiOff size={14} />
                            Offline
                          </>
                        )}
                      </span>
                    </div>

                    <div className={styles.serverStats}>
                      <div className={styles.stat}>
                        <Disc3 size={16} />
                        <span>{formatSize(server.remoteAlbumCount)} álbums</span>
                      </div>
                      <div className={styles.stat}>
                        <Music size={16} />
                        <span>{formatSize(server.remoteTrackCount)} tracks</span>
                      </div>
                      <div className={styles.stat}>
                        <Users size={16} />
                        <span>{formatSize(server.remoteArtistCount)} artistas</span>
                      </div>
                    </div>

                    {server.lastError && (
                      <div className={styles.serverError}>
                        <AlertCircle size={14} />
                        <span>{server.lastError}</span>
                      </div>
                    )}

                    <div className={styles.serverFooter}>
                      <div className={styles.serverMeta}>
                        {!server.isOnline && server.lastOnlineAt && (
                          <span className={styles.lastOnline}>
                            Última conexión: {formatDistanceToNow(new Date(server.lastOnlineAt))}
                          </span>
                        )}
                        {!server.isOnline && server.lastSyncAt && (
                          <span className={styles.lastSync}>
                            Última sync: {formatDistanceToNow(new Date(server.lastSyncAt))}
                          </span>
                        )}
                      </div>
                      <div className={styles.serverActions}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleSync(server)}
                          disabled={syncMutation.isPending}
                          title="Sincronizar"
                        >
                          <RefreshCw size={16} className={syncMutation.isPending ? styles.spinning : ''} />
                        </button>
                        <button
                          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                          onClick={() => disconnectModal.openWith(server)}
                          title="Desconectar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
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
                  <div key={invitation.id} className={styles.invitationCard}>
                    <div className={styles.invitationHeader}>
                      <div className={styles.tokenWrapper}>
                        <code className={styles.token}>{invitation.token}</code>
                        <button
                          className={styles.copyButton}
                          onClick={() => handleCopyToken(invitation.token)}
                          title="Copiar token"
                        >
                          {copiedToken === invitation.token ? (
                            <Check size={16} className={styles.copySuccess} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                      <span className={`${styles.badge} ${invitation.isUsed ? styles.badgeUsed : styles.badgeActive}`}>
                        {invitation.isUsed ? 'Usado' : 'Activo'}
                      </span>
                    </div>
                    {invitation.name && (
                      <p className={styles.invitationName}>{invitation.name}</p>
                    )}
                    <div className={styles.invitationMeta}>
                      <span>Usos: {invitation.currentUses}/{invitation.maxUses}</span>
                      <span>Expira: {formatDistanceToNow(new Date(invitation.expiresAt))}</span>
                    </div>
                    <div className={styles.invitationActions}>
                      <button
                        className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                        onClick={() => deleteInvitationModal.openWith(invitation)}
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  </div>
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
                  <div key={token.id} className={styles.accessCard}>
                    <div className={styles.accessHeader}>
                      <div className={styles.accessInfo}>
                        <Server size={20} />
                        <div>
                          <h4>{token.serverName}</h4>
                          {token.serverUrl && <span className={styles.accessUrl}>{token.serverUrl}</span>}
                        </div>
                      </div>
                      <span className={`${styles.badge} ${token.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                        {token.isActive ? 'Activo' : 'Revocado'}
                      </span>
                    </div>

                    <div className={styles.permissions}>
                      <button
                        className={`${styles.permission} ${styles.permissionToggle} ${token.permissions.canBrowse ? styles.permissionEnabled : ''}`}
                        onClick={() => handleTogglePermission(token, 'canBrowse')}
                        disabled={updatePermissionsMutation.isPending}
                        title={token.permissions.canBrowse ? 'Desactivar permiso' : 'Activar permiso'}
                      >
                        <Eye size={14} />
                        <span>Ver biblioteca</span>
                      </button>
                      <button
                        className={`${styles.permission} ${styles.permissionToggle} ${token.permissions.canStream ? styles.permissionEnabled : ''}`}
                        onClick={() => handleTogglePermission(token, 'canStream')}
                        disabled={updatePermissionsMutation.isPending}
                        title={token.permissions.canStream ? 'Desactivar permiso' : 'Activar permiso'}
                      >
                        <Radio size={14} />
                        <span>Reproducir</span>
                      </button>
                      <button
                        className={`${styles.permission} ${styles.permissionToggle} ${token.permissions.canDownload ? styles.permissionEnabled : ''}`}
                        onClick={() => handleTogglePermission(token, 'canDownload')}
                        disabled={updatePermissionsMutation.isPending}
                        title={token.permissions.canDownload ? 'Desactivar permiso' : 'Activar permiso'}
                      >
                        <Download size={14} />
                        <span>Descargar</span>
                      </button>
                    </div>

                    <div className={styles.accessFooter}>
                      {token.lastUsedAt && (
                        <span className={styles.lastUsed}>
                          Último uso: {formatDistanceToNow(new Date(token.lastUsedAt))}
                        </span>
                      )}
                      <div className={styles.accessActions}>
                        {token.isActive ? (
                          <button
                            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                            onClick={() => revokeAccessModal.openWith(token)}
                          >
                            <Trash2 size={14} />
                            Revocar acceso
                          </button>
                        ) : (
                          <>
                            <button
                              className={`${styles.actionButton} ${styles.actionButtonSuccess}`}
                              onClick={() => handleReactivateAccess(token)}
                              disabled={reactivateAccessMutation.isPending}
                            >
                              <RotateCcw size={14} />
                              Reactivar
                            </button>
                            <button
                              className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                              onClick={() => deleteAccessModal.openWith(token)}
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
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
            setNotification({ type: 'success', message: 'Conectado correctamente' });
          }}
        />
      )}

      {createInvitationModal.isOpen && (
        <CreateInvitationModal
          onClose={createInvitationModal.close}
          onSuccess={() => {
            createInvitationModal.close();
            setNotification({ type: 'success', message: 'Invitación creada' });
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
