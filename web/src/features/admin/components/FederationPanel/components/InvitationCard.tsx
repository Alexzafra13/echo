import { Copy, Check, Trash2 } from 'lucide-react';
import { InvitationToken } from '../../../api/federation.api';
import { formatDistanceToNow } from '@shared/utils/format';
import styles from '../FederationPanel.module.css';

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
  return (
    <div className={styles.invitationCard}>
      <div className={styles.invitationHeader}>
        <div className={styles.tokenWrapper}>
          <code className={styles.token}>{invitation.token}</code>
          <button
            className={styles.copyButton}
            onClick={() => onCopyToken(invitation.token)}
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
          onClick={() => onDelete(invitation)}
        >
          <Trash2 size={14} />
          Eliminar
        </button>
      </div>
    </div>
  );
}
