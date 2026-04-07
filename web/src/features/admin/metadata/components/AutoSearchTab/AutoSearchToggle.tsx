/**
 * Auto-Search Toggle Component
 *
 * Checkbox to enable/disable auto-search during scans
 */

import { useTranslation } from 'react-i18next';
import styles from './AutoSearchTab.module.css';

export interface AutoSearchToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

/**
 * Toggle for enabling/disabling auto-search
 */
export function AutoSearchToggle({ enabled, onChange, disabled }: AutoSearchToggleProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.section}>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label className={styles.settingLabel}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
              className={styles.checkbox}
              disabled={disabled}
            />
            <span>{t('admin.metadata.autoSearch.enableToggle')}</span>
          </label>
          <p className={styles.settingDescription}>
            {t('admin.metadata.autoSearch.enableDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
