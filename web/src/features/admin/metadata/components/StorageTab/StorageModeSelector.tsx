/**
 * Storage Mode Selector Component
 *
 * Radio buttons for selecting centralized or portable storage mode
 */

import { useTranslation } from 'react-i18next';
import { HardDrive } from 'lucide-react';
import type { StorageMode } from '../../types';
import styles from './StorageTab.module.css';

export interface StorageModeSelectorProps {
  mode: StorageMode;
  onChange: (mode: StorageMode) => void;
  disabled?: boolean;
}

/**
 * Storage mode selector with descriptions
 */
export function StorageModeSelector({ mode, onChange, disabled }: StorageModeSelectorProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>
        <HardDrive size={18} />
        {t('admin.metadata.storage.storageMode')}
      </h4>

      <div className={styles.radioGroup}>
        <label className={`${styles.radioOption} ${mode === 'centralized' ? styles.selected : ''}`}>
          <input
            type="radio"
            name="storageMode"
            value="centralized"
            checked={mode === 'centralized'}
            onChange={(e) => onChange(e.target.value as StorageMode)}
            disabled={disabled}
          />
          <div className={styles.radioContent}>
            <div className={styles.radioLabel}>
              <strong>{t('admin.metadata.storage.centralized')}</strong>
              <span className={styles.badge}>{t('admin.metadata.storage.recommended')}</span>
            </div>
            <p className={styles.radioDescription}>{t('admin.metadata.storage.centralizedDesc')}</p>
          </div>
        </label>

        <label className={`${styles.radioOption} ${mode === 'portable' ? styles.selected : ''}`}>
          <input
            type="radio"
            name="storageMode"
            value="portable"
            checked={mode === 'portable'}
            onChange={(e) => onChange(e.target.value as StorageMode)}
            disabled={disabled}
          />
          <div className={styles.radioContent}>
            <div className={styles.radioLabel}>
              <strong>{t('admin.metadata.storage.portable')}</strong>
            </div>
            <p className={styles.radioDescription}>{t('admin.metadata.storage.portableDesc')}</p>
          </div>
        </label>
      </div>
    </div>
  );
}
