import { useState } from 'react';
import { X, Server, Link2, AlertCircle, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components/ui';
import { useConnectToServer } from '../../hooks/useFederation';
import styles from './FederationForms.module.css';

interface ConnectServerModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectServerModal({ onClose, onSuccess }: ConnectServerModalProps) {
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [serverName, setServerName] = useState('');
  const [requestMutual, setRequestMutual] = useState(false);
  const [localServerUrl, setLocalServerUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const connectMutation = useConnectToServer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serverUrl.trim()) {
      setError(t('admin.federation.serverUrlRequired'));
      return;
    }

    try {
      const parsed = new URL(serverUrl.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError(t('admin.federation.serverUrlInvalidProtocol'));
        return;
      }
    } catch {
      setError(t('admin.federation.serverUrlInvalid'));
      return;
    }

    if (!invitationToken.trim()) {
      setError(t('admin.federation.tokenRequired'));
      return;
    }

    if (requestMutual && !localServerUrl.trim()) {
      setError(t('admin.federation.localUrlRequired'));
      return;
    }

    if (requestMutual) {
      try {
        const parsed = new URL(localServerUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setError(t('admin.federation.localUrlInvalidProtocol'));
          return;
        }
      } catch {
        setError(t('admin.federation.localUrlInvalid'));
        return;
      }
    }

    try {
      await connectMutation.mutateAsync({
        serverUrl: serverUrl.trim(),
        invitationToken: invitationToken.trim(),
        serverName: serverName.trim() || undefined,
        localServerUrl: requestMutual ? localServerUrl.trim() : window.location.origin,
        requestMutual,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.federation.errorConnecting'));
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Server size={20} />
            {t('admin.federation.connectToServer')}
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalContent}>
          <p className={styles.modalDescription}>{t('admin.federation.connectDescription')}</p>

          {error && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="serverUrl">{t('admin.federation.serverUrlLabel')}</label>
            <input
              id="serverUrl"
              type="text"
              placeholder={t('admin.federation.serverUrlPlaceholder')}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="invitationToken">{t('admin.federation.tokenLabel')}</label>
            <input
              id="invitationToken"
              type="text"
              placeholder={t('admin.federation.tokenPlaceholder')}
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="serverName">{t('admin.federation.customNameLabel')}</label>
            <input
              id="serverName"
              type="text"
              placeholder={t('admin.federation.customNamePlaceholder')}
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className={styles.input}
            />
            <span className={styles.hint}>{t('admin.federation.customNameHint')}</span>
          </div>

          <label
            className={`${styles.mutualToggle} ${requestMutual ? styles.mutualToggleActive : ''}`}
          >
            <div className={styles.mutualToggleLeft}>
              <Users size={18} />
              <div>
                <span className={styles.mutualToggleTitle}>
                  {t('admin.federation.requestMutual')}
                </span>
                <span className={styles.mutualToggleHint}>
                  {t('admin.federation.requestMutualHint')}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={requestMutual}
              onChange={(e) => setRequestMutual(e.target.checked)}
              className={styles.checkbox}
            />
          </label>

          {requestMutual && (
            <div className={styles.formGroup}>
              <label htmlFor="localServerUrl">{t('admin.federation.localUrlLabel')}</label>
              <input
                id="localServerUrl"
                type="text"
                placeholder={t('admin.federation.localUrlPlaceholder')}
                value={localServerUrl}
                onChange={(e) => setLocalServerUrl(e.target.value)}
                className={styles.input}
              />
              <span className={styles.hint}>{t('admin.federation.localUrlHint')}</span>
            </div>
          )}

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={onClose} type="button">
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={connectMutation.isPending}
              leftIcon={<Link2 size={18} />}
            >
              {connectMutation.isPending
                ? t('admin.federation.connecting')
                : t('admin.federation.connect')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
