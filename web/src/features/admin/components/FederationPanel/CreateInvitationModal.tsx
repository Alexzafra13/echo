import { useState, useRef, useEffect } from 'react';
import { X, Link2, AlertCircle, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@shared/components/ui';
import { useCreateInvitation } from '../../hooks/useFederation';
import { InvitationToken } from '../../api/federation.service';
import styles from './FederationForms.module.css';

interface CreateInvitationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInvitationModal({ onClose, onSuccess }: CreateInvitationModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<InvitationToken | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

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
      setError(err instanceof Error ? err.message : t('admin.federation.errorCreatingInvitation'));
    }
  };

  const handleCopy = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken.token);
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('admin.federation.errorCopying'));
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
            {createdToken
              ? t('admin.federation.invitationCreatedTitle')
              : t('admin.federation.createInvitation')}
          </h3>
          <button className={styles.modalClose} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {createdToken ? (
          <div className={styles.modalContent}>
            <div className={styles.successMessage}>
              <p>{t('admin.federation.invitationCreatedSuccess')}</p>
              <p>{t('admin.federation.invitationShareCode')}</p>
            </div>

            <div className={styles.tokenDisplay}>
              <code className={styles.tokenLarge}>{createdToken.token}</code>
              <button
                className={styles.copyButtonLarge}
                onClick={handleCopy}
                title={t('admin.federation.copyToken')}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    {t('admin.federation.copied')}
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    {t('admin.federation.copy')}
                  </>
                )}
              </button>
            </div>

            <div className={styles.tokenInfo}>
              <p>{t('admin.federation.tokenExpiresIn', { days: expiresInDays })}</p>
              <p>{t('admin.federation.tokenUses', { count: maxUses })}</p>
            </div>

            <div className={styles.modalActions}>
              <Button variant="primary" onClick={handleClose}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalContent}>
            <p className={styles.modalDescription}>{t('admin.federation.createInvitationDesc')}</p>

            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="name">{t('admin.federation.invitationNameLabel')}</label>
              <input
                id="name"
                type="text"
                placeholder={t('admin.federation.invitationNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
              <span className={styles.hint}>{t('admin.federation.invitationNameHint')}</span>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="expiresInDays">{t('admin.federation.expiresInDays')}</label>
                <select
                  id="expiresInDays"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className={styles.select}
                >
                  <option value={1}>{t('admin.federation.day1')}</option>
                  <option value={3}>{t('admin.federation.days3')}</option>
                  <option value={7}>{t('admin.federation.days7')}</option>
                  <option value={14}>{t('admin.federation.days14')}</option>
                  <option value={30}>{t('admin.federation.days30')}</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="maxUses">{t('admin.federation.maxUsesLabel')}</label>
                <select
                  id="maxUses"
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className={styles.select}
                >
                  <option value={1}>{t('admin.federation.use1')}</option>
                  <option value={2}>{t('admin.federation.uses2')}</option>
                  <option value={5}>{t('admin.federation.uses5')}</option>
                  <option value={10}>{t('admin.federation.uses10')}</option>
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={onClose} type="button">
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={createMutation.isPending}
                leftIcon={<Link2 size={18} />}
              >
                {createMutation.isPending
                  ? t('admin.federation.creating')
                  : t('admin.federation.createInvitation')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
