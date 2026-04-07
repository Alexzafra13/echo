import { memo } from 'react';
import { Copy, Check, Trash2, Clock, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InvitationToken } from '../../api/federation.service';
import { formatDistanceToNow } from '@shared/utils/format';
import styles from './InvitationCard.module.css';

interface InvitationCardProps {
  invitation: InvitationToken;
  copiedToken: string | null;
  onCopyToken: (token: string) => void;
  onDelete: (invitation: InvitationToken) => void;
}

export const InvitationCard = memo(function InvitationCard({
  invitation,
  copiedToken,
  onCopyToken,
  onDelete,
}: InvitationCardProps) {
  const { t } = useTranslation();
  const isActive = !invitation.isUsed;

  return (
    <div
      className={`${styles.invitationCard} ${isActive ? styles.invitationCardActive : styles.invitationCardUsed}`}
    >
      <div className={styles.invitationTop}>
        <div className={styles.invitationTokenRow}>
          <code className={styles.token}>{invitation.token}</code>
          <button
            className={styles.copyButton}
            onClick={() => onCopyToken(invitation.token)}
            title={t('admin.federation.copyToken')}
          >
            {copiedToken === invitation.token ? (
              <Check size={14} className={styles.copySuccess} />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
        <div className={styles.invitationTopRight}>
          <span className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeUsed}`}>
            {isActive ? t('admin.federation.statusActive') : t('admin.federation.statusUsed')}
          </span>
          <button
            className={styles.invitationDeleteBtn}
            onClick={() => onDelete(invitation)}
            title={t('admin.federation.deleteInvitation')}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {invitation.name && <p className={styles.invitationName}>{invitation.name}</p>}
      <div className={styles.invitationMeta}>
        <span className={styles.invitationMetaItem}>
          <Hash size={13} />
          {t('admin.federation.uses', { current: invitation.currentUses, max: invitation.maxUses })}
        </span>
        <span className={styles.invitationMetaItem}>
          <Clock size={13} />
          {t('admin.federation.expires', {
            time: formatDistanceToNow(new Date(invitation.expiresAt)),
          })}
        </span>
      </div>
    </div>
  );
});
