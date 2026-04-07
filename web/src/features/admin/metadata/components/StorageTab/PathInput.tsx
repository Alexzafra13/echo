/**
 * Path Input Component
 *
 * Input field with validation display for storage path configuration
 */

import { useTranslation } from 'react-i18next';
import { Folder, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { Input, Button } from '@shared/components/ui';
import type { StorageValidationResult } from '../../types';
import styles from './StorageTab.module.css';

export interface PathInputProps {
  path: string;
  onChange: (path: string) => void;
  onBlur: () => void;
  onBrowse: () => void;
  validationResult: StorageValidationResult | null;
  isValidating: boolean;
  disabled?: boolean;
}

/**
 * Path input with validation feedback
 */
export function PathInput({
  path,
  onChange,
  onBlur,
  onBrowse,
  validationResult,
  isValidating,
  disabled,
}: PathInputProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>
        <Folder size={18} />
        {t('admin.metadata.storage.storagePath')}
      </h4>

      <div className={styles.pathInput}>
        <Input
          type="text"
          value={path}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="/app/uploads/metadata"
          disabled={disabled}
        />
        <Button onClick={onBrowse} variant="outline" size="sm" disabled={disabled}>
          {t('admin.metadata.storage.browse')}
        </Button>
      </div>

      {/* Validation Status */}
      {isValidating && (
        <div className={styles.validating}>{t('admin.metadata.storage.validatingPath')}</div>
      )}

      {validationResult && !isValidating && (
        <div
          className={`${styles.validation} ${
            validationResult.valid ? styles.valid : styles.invalid
          }`}
        >
          {validationResult.valid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <div>
            <strong>{validationResult.message}</strong>
            {validationResult.readOnly && (
              <div className={styles.warning}>
                <Lock size={14} />
                {t('admin.metadata.storage.readOnlyWarning')}
              </div>
            )}
            {!validationResult.exists && validationResult.writable && (
              <div className={styles.info}>{t('admin.metadata.storage.autoCreateFolder')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
