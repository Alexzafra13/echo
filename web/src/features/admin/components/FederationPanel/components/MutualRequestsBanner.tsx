import { Bell, UserPlus, Check, X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { AccessToken } from '../../../api/federation.api';
import styles from '../FederationPanel.module.css';

interface MutualRequestsBannerProps {
  requests: AccessToken[];
  onApprove: (request: AccessToken) => void;
  onReject: (request: AccessToken) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export function MutualRequestsBanner({
  requests,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: MutualRequestsBannerProps) {
  if (requests.length === 0) return null;

  return (
    <div className={styles.mutualRequestsBanner}>
      <div className={styles.mutualRequestsHeader}>
        <Bell size={20} />
        <span>
          {requests.length === 1
            ? '1 servidor quiere conectarse contigo'
            : `${requests.length} servidores quieren conectarse contigo`}
        </span>
      </div>
      <div className={styles.mutualRequestsList}>
        {requests.map((request) => (
          <div key={request.id} className={styles.mutualRequestCard}>
            <div className={styles.mutualRequestInfo}>
              <UserPlus size={18} />
              <div>
                <strong>{request.serverName}</strong>
                {request.serverUrl && (
                  <span className={styles.mutualRequestUrl}>{request.serverUrl}</span>
                )}
              </div>
            </div>
            <div className={styles.mutualRequestActions}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Check size={14} />}
                onClick={() => onApprove(request)}
                disabled={isApproving}
              >
                Aceptar
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<X size={14} />}
                onClick={() => onReject(request)}
                disabled={isRejecting}
              >
                Rechazar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
