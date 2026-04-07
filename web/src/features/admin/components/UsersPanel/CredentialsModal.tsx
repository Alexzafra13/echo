import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Copy, Check, AlertCircle } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { logger } from '@shared/utils/logger';
import styles from './CredentialsModal.module.css';

interface CredentialsModalProps {
  username: string;
  password: string;
  onClose: () => void;
}

export function CredentialsModal({ username, password, onClose }: CredentialsModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        t('admin.users.credentialsCopyText', { username, password })
      );
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error copying to clipboard:', error);
      }
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('admin.users.credentialsTitle')} icon={Key}>
      <div className={styles.content}>
        <div className={styles.alert}>
          <AlertCircle size={20} />
          <p dangerouslySetInnerHTML={{ __html: t('admin.users.credentialsAlert') }} />
        </div>

        <div className={styles.credentials}>
          <div className={styles.credentialItem}>
            <label>{t('admin.users.credentialsUsername')}</label>
            <div className={styles.credentialValue}>{username}</div>
          </div>

          <div className={styles.credentialItem}>
            <label>{t('admin.users.credentialsTempPassword')}</label>
            <div className={styles.credentialValue}>{password}</div>
          </div>
        </div>

        <p className={styles.note}>{t('admin.users.credentialsNote')}</p>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            leftIcon={copied ? <Check size={18} /> : <Copy size={18} />}
            onClick={handleCopy}
          >
            {copied ? t('admin.users.copied') : t('admin.users.copyCredentials')}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t('admin.users.understood')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
