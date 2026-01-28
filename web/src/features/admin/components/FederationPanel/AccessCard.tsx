import { Server, Eye, Radio, Download, Trash2, RotateCcw } from 'lucide-react';
import { AccessToken } from '../../api/federation.api';
import { formatDistanceToNow } from '@shared/utils/format';
import styles from './FederationPanel.module.css';

interface AccessCardProps {
  token: AccessToken;
  onTogglePermission: (token: AccessToken, permission: 'canBrowse' | 'canStream' | 'canDownload') => void;
  onRevoke: (token: AccessToken) => void;
  onReactivate: (token: AccessToken) => void;
  onDelete: (token: AccessToken) => void;
  isUpdatingPermissions: boolean;
  isReactivating: boolean;
}

export function AccessCard({
  token,
  onTogglePermission,
  onRevoke,
  onReactivate,
  onDelete,
  isUpdatingPermissions,
  isReactivating,
}: AccessCardProps) {
  return (
    <div className={styles.accessCard}>
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
          onClick={() => onTogglePermission(token, 'canBrowse')}
          disabled={isUpdatingPermissions}
          title={token.permissions.canBrowse ? 'Desactivar permiso' : 'Activar permiso'}
        >
          <Eye size={14} />
          <span>Ver biblioteca</span>
        </button>
        <button
          className={`${styles.permission} ${styles.permissionToggle} ${token.permissions.canStream ? styles.permissionEnabled : ''}`}
          onClick={() => onTogglePermission(token, 'canStream')}
          disabled={isUpdatingPermissions}
          title={token.permissions.canStream ? 'Desactivar permiso' : 'Activar permiso'}
        >
          <Radio size={14} />
          <span>Reproducir</span>
        </button>
        <button
          className={`${styles.permission} ${styles.permissionToggle} ${token.permissions.canDownload ? styles.permissionEnabled : ''}`}
          onClick={() => onTogglePermission(token, 'canDownload')}
          disabled={isUpdatingPermissions}
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
              onClick={() => onRevoke(token)}
            >
              <Trash2 size={14} />
              Revocar acceso
            </button>
          ) : (
            <>
              <button
                className={`${styles.actionButton} ${styles.actionButtonSuccess}`}
                onClick={() => onReactivate(token)}
                disabled={isReactivating}
              >
                <RotateCcw size={14} />
                Reactivar
              </button>
              <button
                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                onClick={() => onDelete(token)}
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
