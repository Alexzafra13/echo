import { Copy, Check, Trash2, Clock, Hash } from 'lucide-react';
import { InvitationToken } from '../../api/federation.api';
import { formatDistanceToNow } from '@shared/utils/format';
import styles from './FederationPanel.module.css';

interface InvitationCardProps {
  invitation: InvitationToken;
  copiedToken: string | null;
  onCopyToken: (token: string) => void;
  onDelete: (invitation: InvitationToken) => void;
}

export function InvitationCard({
  invitation,
  copiedToken,
  onCopyToken,
  onDelete,
}: InvitationCardProps) {
  const isActive = !invitation.isUsed;

  return (
    <div className={`${styles.invitationCard} ${isActive ? styles.invitationCardActive : styles.invitationCardUsed}`}>
      <div className={styles.invitationTop}>
        <div className={styles.invitationTokenRow}>
          <code className={styles.token}>{invitation.token}</code>
          <button
            className={styles.copyButton}
            onClick={() => onCopyToken(invitation.token)}
            title="Copiar token"
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
            {isActive ? 'Activo' : 'Usado'}
          </span>
          <button
            className={styles.invitationDeleteBtn}
            onClick={() => onDelete(invitation)}
            title="Eliminar invitación"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {invitation.name && (
        <p className={styles.invitationName}>{invitation.name}</p>
      )}
      <div className={styles.invitationMeta}>
        <span className={styles.invitationMetaItem}>
          <Hash size={13} />
          Usos: {invitation.currentUses}/{invitation.maxUses}
        </span>
        <span className={styles.invitationMetaItem}>
          <Clock size={13} />
          Expira: {formatDistanceToNow(new Date(invitation.expiresAt))}
        </span>
      </div>
    </div>
  );
}
