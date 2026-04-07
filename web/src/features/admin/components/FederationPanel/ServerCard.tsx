import { memo, useState } from 'react';
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
  Palette,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConnectedServer } from '../../api/federation.service';
import { formatDistanceToNow } from '@shared/utils/format';
import { formatSize } from './utils';
import { getServerColorStyle, SERVER_COLORS } from './serverColors';
import styles from './ServerCard.module.css';

interface ServerCardProps {
  server: ConnectedServer;
  onSync: (server: ConnectedServer) => void;
  onDisconnect: (server: ConnectedServer) => void;
  onColorChange?: (serverId: string, color: string) => void;
  isSyncing: boolean;
}

export const ServerCard = memo(function ServerCard({
  server,
  onSync,
  onDisconnect,
  onColorChange,
  isSyncing,
}: ServerCardProps) {
  const { t } = useTranslation();
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className={styles.serverCard} style={getServerColorStyle(server.color)}>
      <div className={styles.serverHeader}>
        <div className={styles.serverIcon}>
          <Server size={24} />
        </div>
        <div className={styles.serverInfo}>
          <h4 className={styles.serverName}>{server.name}</h4>
          <span className={styles.serverUrl}>{server.baseUrl}</span>
        </div>
        <span
          className={`${styles.serverStatus} ${server.isOnline ? styles.statusOnline : styles.statusOffline}`}
        >
          {server.isOnline ? (
            <>
              <Wifi size={14} />
              {t('admin.federation.online')}
            </>
          ) : (
            <>
              <WifiOff size={14} />
              {t('admin.federation.offline')}
            </>
          )}
        </span>
      </div>

      <div className={styles.serverStats}>
        <div className={styles.stat}>
          <Disc3 size={16} />
          <span>
            {formatSize(server.remoteAlbumCount)} {t('admin.federation.albums')}
          </span>
        </div>
        <div className={styles.stat}>
          <Music size={16} />
          <span>
            {formatSize(server.remoteTrackCount)} {t('admin.federation.tracks')}
          </span>
        </div>
        <div className={styles.stat}>
          <Users size={16} />
          <span>
            {formatSize(server.remoteArtistCount)} {t('admin.federation.artists')}
          </span>
        </div>
      </div>

      {server.lastError && (
        <div className={styles.serverError}>
          <AlertCircle size={14} />
          <span>{server.lastError}</span>
        </div>
      )}

      {showColorPicker && (
        <div className={styles.colorPickerInline}>
          {SERVER_COLORS.map((color) => (
            <button
              key={color.name}
              type="button"
              className={`${styles.colorSwatch} ${styles.colorSwatchSmall} ${server.color === color.name ? styles.colorSwatchActive : ''}`}
              style={
                { '--swatch-color': color.hex, '--swatch-rgb': color.rgb } as React.CSSProperties
              }
              onClick={() => {
                onColorChange?.(server.id, color.name);
                setShowColorPicker(false);
              }}
              title={color.label}
              aria-label={color.label}
            />
          ))}
        </div>
      )}

      <div className={styles.serverFooter}>
        <div className={styles.serverMeta}>
          {!server.isOnline && server.lastOnlineAt && (
            <span className={styles.lastOnline}>
              {t('admin.federation.lastConnection', {
                time: formatDistanceToNow(new Date(server.lastOnlineAt)),
              })}
            </span>
          )}
          {!server.isOnline && server.lastSyncAt && (
            <span className={styles.lastSync}>
              {t('admin.federation.lastSync', {
                time: formatDistanceToNow(new Date(server.lastSyncAt)),
              })}
            </span>
          )}
        </div>
        <div className={styles.serverActions}>
          <button
            className={styles.iconButton}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title={t('admin.federation.changeColor')}
          >
            <Palette size={16} />
          </button>
          <button
            className={styles.iconButton}
            onClick={() => onSync(server)}
            disabled={isSyncing}
            title={t('admin.federation.sync')}
          >
            <RefreshCw size={16} className={isSyncing ? styles.spinning : ''} />
          </button>
          <button
            className={`${styles.iconButton} ${styles.iconButtonDanger}`}
            onClick={() => onDisconnect(server)}
            title={t('admin.federation.disconnect')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});
