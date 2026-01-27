import { UserPlus, UserCheck, Clock, X, Check } from 'lucide-react';
import type { FriendshipStatus } from '../../../services/public-profiles.service';
import styles from '../PublicProfilePage.module.css';

interface FriendButtonProps {
  status: FriendshipStatus;
  friendshipId?: string;
  onSendRequest: () => void;
  onAcceptRequest: () => void;
  onCancelRequest: () => void;
  isLoading: boolean;
}

export function FriendButton({
  status,
  onSendRequest,
  onAcceptRequest,
  onCancelRequest,
  isLoading,
}: FriendButtonProps) {
  if (status === 'self') return null;

  switch (status) {
    case 'none':
      return (
        <button
          className={`${styles.publicProfilePage__friendBtn} ${styles['publicProfilePage__friendBtn--primary']}`}
          onClick={onSendRequest}
          disabled={isLoading}
        >
          <UserPlus size={18} />
          Añadir amigo
        </button>
      );

    case 'pending_sent':
      return (
        <button
          className={`${styles.publicProfilePage__friendBtn} ${styles['publicProfilePage__friendBtn--pending']}`}
          onClick={onCancelRequest}
          disabled={isLoading}
        >
          <Clock size={18} />
          Solicitud enviada
        </button>
      );

    case 'pending_received':
      return (
        <div className={styles.publicProfilePage__friendActions}>
          <button
            className={`${styles.publicProfilePage__friendBtn} ${styles['publicProfilePage__friendBtn--primary']}`}
            onClick={onAcceptRequest}
            disabled={isLoading}
          >
            <Check size={18} />
            Aceptar
          </button>
          <button
            className={`${styles.publicProfilePage__iconBtn} ${styles['publicProfilePage__iconBtn--danger']}`}
            onClick={onCancelRequest}
            disabled={isLoading}
            aria-label="Rechazar solicitud"
          >
            <X size={18} />
          </button>
        </div>
      );

    case 'accepted':
      return (
        <button
          className={`${styles.publicProfilePage__friendBtn} ${styles['publicProfilePage__friendBtn--accepted']}`}
          disabled
        >
          <UserCheck size={18} />
          Amigos
        </button>
      );

    default:
      return null;
  }
}
