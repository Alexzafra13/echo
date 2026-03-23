import { useState } from 'react';
import { Radio } from 'lucide-react';
import { Modal, Button, Input } from '@shared/components/ui';
import { useJoinSession } from '../../hooks';
import styles from './JoinSessionModal.module.css';

interface JoinSessionModalProps {
  onClose: () => void;
  initialCode?: string;
}

export function JoinSessionModal({ onClose, initialCode = '' }: JoinSessionModalProps) {
  const [code, setCode] = useState(initialCode);
  const joinSession = useJoinSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      await joinSession.mutateAsync({ inviteCode: code.trim().toUpperCase() });
      onClose();
    } catch {
      // Error gestionado por TanStack Query
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Unirse a Sesion"
      icon={Radio}
      subtitle="Introduce el codigo de invitacion"
      width="420px"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Codigo de invitacion"
          placeholder="Ej: ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoFocus
        />

        {joinSession.isError && (
          <p className={styles.error}>
            Codigo no valido o la sesion ya no esta activa.
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="outline" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!code.trim() || joinSession.isPending}
          >
            {joinSession.isPending ? 'Conectando...' : 'Unirse'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
