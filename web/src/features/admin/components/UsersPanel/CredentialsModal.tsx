import { useState } from 'react';
import { Key, Copy, Check, AlertCircle } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { logger } from '@shared/utils/logger';
import styles from './CredentialsModal.module.css';

interface CredentialsModalProps {
  username: string;
  password: string;
  onClose: () => void;
}

export function CredentialsModal({
  username,
  password,
  onClose,
}: CredentialsModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Usuario: ${username}\nContraseña temporal: ${password}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error copying to clipboard:', error);
      }
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Credenciales Generadas"
      icon={Key}
    >
      <div className={styles.content}>
        <div className={styles.alert}>
          <AlertCircle size={20} />
          <p>
            Esta información solo se mostrará <strong>una vez</strong>.
            Asegúrate de comunicar estas credenciales al usuario.
          </p>
        </div>

        <div className={styles.credentials}>
          <div className={styles.credentialItem}>
            <label>Username</label>
            <div className={styles.credentialValue}>{username}</div>
          </div>

          <div className={styles.credentialItem}>
            <label>Contraseña Temporal</label>
            <div className={styles.credentialValue}>{password}</div>
          </div>
        </div>

        <p className={styles.note}>
          El usuario deberá cambiar esta contraseña en su primer inicio de sesión.
        </p>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            leftIcon={copied ? <Check size={18} /> : <Copy size={18} />}
            onClick={handleCopy}
          >
            {copied ? 'Copiado!' : 'Copiar Credenciales'}
          </Button>
          <Button variant="primary" onClick={onClose}>
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  );
}
