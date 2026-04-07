import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './LogsPanel.module.css';

interface CopyableDetailProps {
  label: string;
  value: string;
  /** Contenido a mostrar (puede diferir de value, ej: pre formateado) */
  children: React.ReactNode;
  copiedField: string | null;
  fieldId: string;
  onCopy: (text: string, fieldId: string) => void;
}

export function CopyableDetail({
  label,
  value,
  children,
  copiedField,
  fieldId,
  onCopy,
}: CopyableDetailProps) {
  const { t } = useTranslation();
  const isCopied = copiedField === fieldId;

  return (
    <div className={styles.detailRow}>
      <div className={styles.detailRowHeader}>
        <span className={styles.detailLabel}>{label}</span>
        <button
          className={styles.copyButton}
          onClick={() => onCopy(value, fieldId)}
          title={t('admin.logs.copy')}
        >
          {isCopied ? (
            <>
              <Check size={12} /> {t('admin.logs.copied')}
            </>
          ) : (
            <>
              <Copy size={12} /> {t('admin.logs.copy')}
            </>
          )}
        </button>
      </div>
      {children}
    </div>
  );
}
