import { useState } from 'react';
import { X, Server, Link2, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  const connectMutation = useConnectToServer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serverUrl.trim()) {
      setError('La URL del servidor es requerida');
      return;
    }

    if (!invitationToken.trim()) {
      setError('El token de invitación es requerido');
      return;
    }

    try {
      await connectMutation.mutateAsync({
        serverUrl: serverUrl.trim(),
        invitationToken: invitationToken.trim(),
        serverName: serverName.trim() || undefined,
        localServerUrl: window.location.origin, // Enviar nuestra URL para que el servidor remoto pueda identificarnos
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
