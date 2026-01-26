import { useState } from 'react';
import { X, Link2, AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useCreateInvitation } from '../../hooks/useFederation';
import { InvitationToken } from '../../api/federation.api';
import styles from './FederationPanel.module.css';

interface CreateInvitationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInvitationModal({ onClose, onSuccess }: CreateInvitationModalProps) {
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<InvitationToken | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateInvitation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const token = await createMutation.mutateAsync({
        name: name.trim() || undefined,
        expiresInDays,
        maxUses,
      });
      setCreatedToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la invitación');
    }
  };

  const handleCopy = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Error al copiar el token');
    }
  };

  const handleClose = () => {
    if (createdToken) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Link2 size={20} />
            {createdToken ? 'Invitación creada' : 'Crear invitación'}
          </h3>
          <button className={styles.modalClose} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {createdToken ? (
          <div className={styles.modalContent}>
            <div className={styles.successMessage}>
              <p>¡Invitación creada exitosamente!</p>
              <p>Comparte este código con tu amigo para que pueda conectarse:</p>
            </div>

            <div className={styles.tokenDisplay}>
              <code className={styles.tokenLarge}>{createdToken.token}</code>
              <button
                className={styles.copyButtonLarge}
                onClick={handleCopy}
                title="Copiar token"
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copiar
                  </>
                )}
              </button>
            </div>

            <div className={styles.tokenInfo}>
              <p>Este token expira en {expiresInDays} días</p>
              <p>Se puede usar {maxUses} {maxUses === 1 ? 'vez' : 'veces'}</p>
            </div>

            <div className={styles.modalActions}>
              <Button variant="primary" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalContent}>
            <p className={styles.modalDescription}>
              Crea un token de invitación para que un amigo pueda conectarse a tu servidor y ver tu biblioteca.
            </p>

            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="name">Nombre (opcional)</label>
              <input
                id="name"
                type="text"
                placeholder="Token para Juan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
              <span className={styles.hint}>
                Un nombre descriptivo para identificar esta invitación
              </span>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="expiresInDays">Expira en (días)</label>
                <select
                  id="expiresInDays"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className={styles.select}
                >
                  <option value={1}>1 día</option>
                  <option value={3}>3 días</option>
                  <option value={7}>7 días</option>
                  <option value={14}>14 días</option>
                  <option value={30}>30 días</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="maxUses">Usos máximos</label>
                <select
                  id="maxUses"
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className={styles.select}
                >
                  <option value={1}>1 uso</option>
                  <option value={2}>2 usos</option>
                  <option value={5}>5 usos</option>
                  <option value={10}>10 usos</option>
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button variant="danger" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={createMutation.isPending}
                leftIcon={<Link2 size={18} />}
              >
                {createMutation.isPending ? 'Creando...' : 'Crear invitación'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
