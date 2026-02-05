import { useState } from 'react';
import { X, Server, Link2, AlertCircle, Users } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useConnectToServer } from '../../hooks/useFederation';
import styles from './FederationPanel.module.css';

interface ConnectServerModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ConnectServerModal({ onClose, onSuccess }: ConnectServerModalProps) {
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
      setError('La URL del servidor es requerida');
      return;
    }

    try {
      const parsed = new URL(serverUrl.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError('La URL debe usar http:// o https://');
        return;
      }
    } catch {
      setError('La URL del servidor no es válida');
      return;
    }

    if (!invitationToken.trim()) {
      setError('El token de invitación es requerido');
      return;
    }

    if (requestMutual && !localServerUrl.trim()) {
      setError('La URL de tu servidor es requerida para federación mutua');
      return;
    }

    if (requestMutual) {
      try {
        const parsed = new URL(localServerUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setError('La URL de tu servidor debe usar http:// o https://');
          return;
        }
      } catch {
        setError('La URL de tu servidor no es válida');
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
      setError(err instanceof Error ? err.message : 'Error al conectar con el servidor');
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Server size={20} />
            Conectar a servidor
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalContent}>
          <p className={styles.modalDescription}>
            Introduce la URL del servidor de tu amigo y el token de invitación que te haya proporcionado.
          </p>

          {error && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="serverUrl">URL del servidor *</label>
            <input
              id="serverUrl"
              type="text"
              placeholder="https://music.ejemplo.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="invitationToken">Token de invitación *</label>
            <input
              id="invitationToken"
              type="text"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="serverName">Nombre personalizado (opcional)</label>
            <input
              id="serverName"
              type="text"
              placeholder="Servidor de Juan"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className={styles.input}
            />
            <span className={styles.hint}>
              Si no especificas un nombre, se usará el del servidor remoto
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={requestMutual}
                onChange={(e) => setRequestMutual(e.target.checked)}
                className={styles.checkbox}
              />
              <Users size={16} />
              <span>Solicitar federación mutua</span>
            </label>
            <span className={styles.hint}>
              Si activas esta opción, el servidor remoto también podrá ver tu biblioteca musical.
              Requiere aprobación del administrador del otro servidor.
            </span>
          </div>

          {requestMutual && (
            <div className={styles.formGroup}>
              <label htmlFor="localServerUrl">URL pública de tu servidor *</label>
              <input
                id="localServerUrl"
                type="text"
                placeholder="https://tu-servidor.ejemplo.com"
                value={localServerUrl}
                onChange={(e) => setLocalServerUrl(e.target.value)}
                className={styles.input}
              />
              <span className={styles.hint}>
                La URL donde el otro servidor puede acceder a tu instancia de Echo
              </span>
            </div>
          )}

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={connectMutation.isPending}
              leftIcon={<Link2 size={18} />}
            >
              {connectMutation.isPending ? 'Conectando...' : 'Conectar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
