/**
 * Auto Enrich Toggle Component
 *
 * Toggle switch for enabling/disabling automatic metadata enrichment
 */

import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import styles from './AutoEnrichToggle.module.css';

export interface AutoEnrichToggleProps {
  /** Whether auto-enrich is currently enabled */
  enabled: boolean;
  /** Callback when toggle is clicked */
  onChange: (enabled: boolean) => void;
  /** Whether update is in progress */
  isUpdating?: boolean;
}

/**
 * AutoEnrichToggle - Toggle for auto-enrichment setting
 *
 * @example
 * ```tsx
 * <AutoEnrichToggle
 *   enabled={settings.autoEnrichEnabled}
 *   onChange={(enabled) => updateSettings.mutate({ autoEnrichEnabled: enabled })}
 *   isUpdating={updateSettings.isPending}
 * />
 * ```
 */
export function AutoEnrichToggle({ enabled, onChange, isUpdating = false }: AutoEnrichToggleProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerIcon}>
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className={styles.sectionTitle}>
            {t('admin.metadata.providersTab.autoEnrichTitle')}
          </h3>
          <p className={styles.sectionDescription}>
            {t('admin.metadata.providersTab.autoEnrichDescription')}
          </p>
        </div>
      </div>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          disabled={isUpdating}
          className={styles.toggleInput}
        />
        <span className={styles.toggleSlider} />
        <span className={styles.toggleLabel}>
          {enabled
            ? t('admin.metadata.providersTab.activated')
            : t('admin.metadata.providersTab.deactivated')}
        </span>
      </label>
    </div>
  );
}
