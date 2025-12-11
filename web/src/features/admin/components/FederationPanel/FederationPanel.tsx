import { useState } from 'react';
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
} from 'lucide-react';
import { Button, InlineNotification } from '@shared/components/ui';
import {
  useConnectedServers,
  useInvitationTokens,
  useAccessTokens,
  useDeleteInvitation,
  useDisconnectFromServer,
  useSyncServer,
  useRevokeAccessToken,
  useCheckAllServersHealth,
} from '../../hooks/useFederation';
import { ConnectedServer, InvitationToken, AccessToken } from '../../api/federation.api';
import { ConnectServerModal } from './ConnectServerModal';
import { CreateInvitationModal } from './CreateInvitationModal';
import { ConfirmDialog } from './ConfirmDialog';
import { formatDistanceToNow } from '@shared/utils/format';
import styles from './FederationPanel.module.css';
import type { NotificationType } from '@shared/components/ui';

/**
 * FederationPanel Component
 * Panel para gestionar conexiones con otros servidores Echo
 */
export function FederationPanel() {
  const [activeTab, setActiveTab] = useState<'servers' | 'invitations' | 'access'>('servers');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCreateInvitationOpen, setIsCreateInvitationOpen] = useState(false);
  const [serverToDisconnect, setServerToDisconnect] = useState<ConnectedServer | null>(null);
  const [invitationToDelete, setInvitationToDelete] = useState<InvitationToken | null>(null);
  const [accessToRevoke, setAccessToRevoke] = useState<AccessToken | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  // Queries
  const { data: servers, isLoading: serversLoading } = useConnectedServers();
  const { data: invitations, isLoading: invitationsLoading } = useInvitationTokens();
  const { data: accessTokens, isLoading: accessLoading } = useAccessTokens();

  // Mutations
  const disconnectMutation = useDisconnectFromServer();
  const syncMutation = useSyncServer();
  const deleteInvitationMutation = useDeleteInvitation();
  const revokeAccessMutation = useRevokeAccessToken();
  const checkHealthMutation = useCheckAllServersHealth();

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
    if (!serverToDisconnect) return;
    try {
      await disconnectMutation.mutateAsync(serverToDisconnect.id);
      setServerToDisconnect(null);
      setNotification({ type: 'success', message: 'Desconectado correctamente' });
    } catch {
      setNotification({ type: 'error', message: 'Error al desconectar' });
    }
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;
    try {
      await deleteInvitationMutation.mutateAsync(invitationToDelete.id);
      setInvitationToDelete(null);
      setNotification({ type: 'success', message: 'Invitación eliminada' });
    } catch {
      setNotification({ type: 'error', message: 'Error al eliminar invitación' });
    }
  };

  const handleRevokeAccess = async () => {
    if (!accessToRevoke) return;
    try {
      await revokeAccessMutation.mutateAsync(accessToRevoke.id);
      setAccessToRevoke(null);
      setNotification({ type: 'success', message: 'Acceso revocado' });
    } catch {
      setNotification({ type: 'error', message: 'Error al revocar acceso' });
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
        />
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
                  onClick={() => setIsConnectModalOpen(true)}
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
                        {server.lastSyncAt && (
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
                          onClick={() => setServerToDisconnect(server)}
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
                  onClick={() => setIsConnectModalOpen(true)}
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
                onClick={() => setIsCreateInvitationOpen(true)}
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
                        onClick={() => setInvitationToDelete(invitation)}
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
                  onClick={() => setIsCreateInvitationOpen(true)}
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
                      <div className={`${styles.permission} ${token.permissions.canBrowse ? styles.permissionEnabled : ''}`}>
                        <Eye size={14} />
                        <span>Ver biblioteca</span>
                      </div>
                      <div className={`${styles.permission} ${token.permissions.canStream ? styles.permissionEnabled : ''}`}>
                        <Radio size={14} />
                        <span>Reproducir</span>
                      </div>
                      <div className={`${styles.permission} ${token.permissions.canDownload ? styles.permissionEnabled : ''}`}>
                        <Download size={14} />
                        <span>Descargar</span>
                      </div>
                    </div>

                    <div className={styles.accessFooter}>
                      {token.lastUsedAt && (
                        <span className={styles.lastUsed}>
                          Último uso: {formatDistanceToNow(new Date(token.lastUsedAt))}
                        </span>
                      )}
                      {token.isActive && (
                        <button
                          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                          onClick={() => setAccessToRevoke(token)}
                        >
                          <Trash2 size={14} />
                          Revocar acceso
                        </button>
                      )}
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
      {isConnectModalOpen && (
        <ConnectServerModal
          onClose={() => setIsConnectModalOpen(false)}
          onSuccess={() => {
            setIsConnectModalOpen(false);
            setNotification({ type: 'success', message: 'Conectado correctamente' });
          }}
        />
      )}

      {isCreateInvitationOpen && (
        <CreateInvitationModal
          onClose={() => setIsCreateInvitationOpen(false)}
          onSuccess={() => {
            setIsCreateInvitationOpen(false);
            setNotification({ type: 'success', message: 'Invitación creada' });
          }}
        />
      )}

      {serverToDisconnect && (
        <ConfirmDialog
          title="Desconectar servidor"
          message={`¿Estás seguro de que quieres desconectar de "${serverToDisconnect.name}"? Ya no podrás ver su biblioteca.`}
          confirmText="Desconectar"
          onConfirm={handleDisconnect}
          onCancel={() => setServerToDisconnect(null)}
          isLoading={disconnectMutation.isPending}
        />
      )}

      {invitationToDelete && (
        <ConfirmDialog
          title="Eliminar invitación"
          message="¿Estás seguro de que quieres eliminar esta invitación? Los servidores que ya la usaron mantendrán el acceso."
          confirmText="Eliminar"
          onConfirm={handleDeleteInvitation}
          onCancel={() => setInvitationToDelete(null)}
          isLoading={deleteInvitationMutation.isPending}
        />
      )}

      {accessToRevoke && (
        <ConfirmDialog
          title="Revocar acceso"
          message={`¿Estás seguro de que quieres revocar el acceso de "${accessToRevoke.serverName}"? Ya no podrán ver ni reproducir tu música.`}
          confirmText="Revocar"
          onConfirm={handleRevokeAccess}
          onCancel={() => setAccessToRevoke(null)}
          isLoading={revokeAccessMutation.isPending}
        />
      )}
    </div>
  );
}
