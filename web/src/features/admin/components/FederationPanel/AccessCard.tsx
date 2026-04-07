import { memo } from 'react';
import { Server, Eye, Radio, Download, Trash2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccessToken } from '../../api/federation.service';
import { formatDistanceToNow } from '@shared/utils/format';
import styles from './AccessCard.module.css';

interface AccessCardProps {
  token: AccessToken;
  onTogglePermission: (
    token: AccessToken,
    permission: 'canBrowse' | 'canStream' | 'canDownload'
  ) => void;
  onRevoke: (token: AccessToken) => void;
  onReactivate: (token: AccessToken) => void;
  onDelete: (token: AccessToken) => void;
  isUpdatingPermissions: boolean;
  isReactivating: boolean;
}

export const AccessCard = memo(function AccessCard({
  token,
  onTogglePermission,
  onRevoke,
  onReactivate,
  onDelete,
  isUpdatingPermissions,
  isReactivating,
}: AccessCardProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.accessCard}>
      <div className={styles.accessHeader}>
        <div className={styles.accessInfo}>
          <div className={styles.accessIcon}>
            <Server size={20} />
          </div>
          <div>
            <h4>{token.serverName}</h4>
            {token.serverUrl && <span className={styles.accessUrl}>{token.serverUrl}</span>}
          </div>
        </div>
        <span
          className={`${styles.badge} ${token.isActive ? styles.badgeActive : styles.badgeInactive}`}
        >
          {token.isActive
            ? t('admin.federation.statusActive')
            : t('admin.federation.statusRevoked')}
        </span>
      </div>

      <div className={styles.permissions}>
        <button
          className={`${styles.permission} ${styles.permissionToggle} ${token.permissions.canBrowse ? styles.permissionEnabled : ''}`}
          onClick={() => onTogglePermission(token, 'canBrowse')}
          disabled={isUpdatingPermissions}
          title={
            token.permissions.canBrowse
              ? t('admin.federation.disablePermission')
              : t('admin.federation.enablePermission')
          }
        >
          <Eye size={14} />
          <span>{t('admin.federation.browseLibrary')}</span>
        </button>
        <button
          className={`${styles.permission} ${styles.permissionToggle} ${token.permissions.canStream ? styles.permissionEnabled : ''}`}
          onClick={() => onTogglePermission(token, 'canStream')}
          disabled={isUpdatingPermissions}
          title={
            token.permissions.canStream
              ? t('admin.federation.disablePermission')
              : t('admin.federation.enablePermission')
          }
        >
          <Radio size={14} />
          <span>{t('admin.federation.stream')}</span>
        </button>
        <button
          className={`${styles.permission} ${styles.permissionToggle} ${token.permissions.canDownload ? styles.permissionEnabled : ''}`}
          onClick={() => onTogglePermission(token, 'canDownload')}
          disabled={isUpdatingPermissions}
          title={
            token.permissions.canDownload
              ? t('admin.federation.disablePermission')
              : t('admin.federation.enablePermission')
          }
        >
          <Download size={14} />
          <span>{t('admin.federation.download')}</span>
        </button>
      </div>

      <div className={styles.accessFooter}>
        {token.lastUsedAt && (
          <span className={styles.lastUsed}>
            {t('admin.federation.lastUsed', {
              time: formatDistanceToNow(new Date(token.lastUsedAt)),
            })}
          </span>
        )}
        <div className={styles.accessActions}>
          {token.isActive ? (
            <button
              className={`${styles.actionButton} ${styles.actionButtonDanger}`}
              onClick={() => onRevoke(token)}
            >
              <Trash2 size={14} />
              {t('admin.federation.revokeAccess')}
            </button>
          ) : (
            <>
              <button
                className={`${styles.actionButton} ${styles.actionButtonSuccess}`}
                onClick={() => onReactivate(token)}
                disabled={isReactivating}
              >
                <RotateCcw size={14} />
                {t('admin.federation.reactivate')}
              </button>
              <button
                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                onClick={() => onDelete(token)}
              >
                <Trash2 size={14} />
                {t('common.delete')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
