import { Clock, Send, Check, X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import type { Friend } from '../../../services/social.service';
import styles from '../SocialPage.module.css';

interface PendingRequestsSectionProps {
  received: Friend[];
  sent: Friend[];
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string) => void;
  isAccepting: boolean;
  isRemoving: boolean;
}

export function PendingRequestsSection({
  received,
  sent,
  onAccept,
  onReject,
  isAccepting,
  isRemoving,
}: PendingRequestsSectionProps) {
  return (
    <>
      {/* Received Requests */}
      {received.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.section__title}>
            <div className={styles.section__titleIcon}>
              <Clock size={18} />
            </div>
            Solicitudes recibidas
            <span className={styles.section__badge}>
              {received.length}
            </span>
          </h2>
          <div className={styles.requestsList}>
            {received.map((request) => (
              <div key={request.friendshipId} className={styles.requestCard}>
                <img
                  src={request.avatarUrl || getUserAvatarUrl(request.id, false)}
                  alt={request.username}
                  className={styles.requestCard__avatar}
                  onError={handleAvatarError}
                />
                <div className={styles.requestCard__info}>
                  <span className={styles.requestCard__name}>
                    {request.name || request.username}
                  </span>
                  <span className={styles.requestCard__text}>
                    quiere ser tu amigo
                  </span>
                </div>
                <div className={styles.requestCard__actions}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onAccept(request.friendshipId)}
                    disabled={isAccepting}
                  >
                    <Check size={16} />
                    Aceptar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(request.friendshipId)}
                    disabled={isRemoving}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sent Requests */}
      {sent.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.section__title}>
            <div className={styles.section__titleIcon}>
              <Send size={18} />
            </div>
            Solicitudes enviadas
            <span className={styles.section__badge}>
              {sent.length}
            </span>
          </h2>
          <div className={styles.requestsList}>
            {sent.map((request) => (
              <div key={request.friendshipId} className={styles.requestCard}>
                <img
                  src={request.avatarUrl || getUserAvatarUrl(request.id, false)}
                  alt={request.username}
                  className={styles.requestCard__avatar}
                  onError={handleAvatarError}
                />
                <div className={styles.requestCard__info}>
                  <span className={styles.requestCard__name}>
                    {request.name || request.username}
                  </span>
                  <span className={styles.requestCard__textSent}>
                    Esperando respuesta...
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReject(request.friendshipId)}
                  disabled={isRemoving}
                  title="Cancelar solicitud"
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
