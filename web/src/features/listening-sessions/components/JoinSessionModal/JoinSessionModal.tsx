import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio } from 'lucide-react';
import { Modal, Button, Input } from '@shared/components/ui';
import { useJoinSession } from '../../hooks';
import styles from './JoinSessionModal.module.css';

interface JoinSessionModalProps {
  onClose: () => void;
  initialCode?: string;
}

export function JoinSessionModal({ onClose, initialCode = '' }: JoinSessionModalProps) {
  const { t } = useTranslation();
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
      title={t('sessions.joinTitle')}
      icon={Radio}
      subtitle={t('sessions.joinSubtitle')}
      width="420px"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label={t('sessions.inviteCodeLabel')}
          placeholder={t('sessions.inviteCodePlaceholder')}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoFocus
        />

        {joinSession.isError && <p className={styles.error}>{t('sessions.joinError')}</p>}

        <div className={styles.actions}>
          <Button variant="outline" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={!code.trim() || joinSession.isPending}>
            {joinSession.isPending ? t('sessions.connecting') : t('sessions.join')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
