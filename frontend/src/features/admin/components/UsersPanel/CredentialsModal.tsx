import { useState } from 'react';
import { Key, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@shared/components/ui';
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
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconContainer}>
          <Key size={48} className={styles.icon} />
        </div>

        <h2 className={styles.title}>Credenciales Generadas</h2>

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
    </div>
  );
}
