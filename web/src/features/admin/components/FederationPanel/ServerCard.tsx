import {
  Server,
  RefreshCw,
  Trash2,
  AlertCircle,
  Users,
  Disc3,
  Music,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ConnectedServer } from '../../api/federation.api';
import { formatDistanceToNow } from '@shared/utils/format';
import { formatSize } from './utils';
import styles from './FederationPanel.module.css';

interface ServerCardProps {
  server: ConnectedServer;
  onSync: (server: ConnectedServer) => void;
  onDisconnect: (server: ConnectedServer) => void;
  isSyncing: boolean;
}

export function ServerCard({ server, onSync, onDisconnect, isSyncing }: ServerCardProps) {
  return (
    <div className={styles.serverCard}>
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
            onClick={() => onSync(server)}
            disabled={isSyncing}
            title="Sincronizar"
          >
            <RefreshCw size={16} className={isSyncing ? styles.spinning : ''} />
          </button>
          <button
            className={`${styles.iconButton} ${styles.iconButtonDanger}`}
            onClick={() => onDisconnect(server)}
            title="Desconectar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
