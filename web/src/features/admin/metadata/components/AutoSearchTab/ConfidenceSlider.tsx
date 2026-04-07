/**
 * Confidence Slider Component
 *
 * Slider for configuring auto-search confidence threshold with visual feedback
 */

import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import styles from './AutoSearchTab.module.css';

export interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Confidence threshold slider with visual explanations
 */
export function ConfidenceSlider({ value, onChange, disabled }: ConfidenceSliderProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.section}>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label className={styles.settingLabel}>
            {t('admin.metadata.autoSearch.confidenceThreshold')}
          </label>
          <p className={styles.settingDescription}>
            {t('admin.metadata.autoSearch.confidenceDescription')}
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className={styles.sliderSection}>
        <div className={styles.sliderRow}>
          <input
            type="range"
            min="75"
            max="100"
            step="1"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            disabled={disabled}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              outline: 'none',
              background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${
                ((value - 75) / 25) * 100
              }%, var(--border-secondary) ${
                ((value - 75) / 25) * 100
              }%, var(--border-secondary) 100%)`,
            }}
          />
          <span className={styles.sliderValue}>{value}</span>
        </div>

        {/* Threshold explanation */}
        <div className={styles.thresholdList}>
          <div className={`${styles.thresholdBox} ${styles.thresholdBoxSuccess}`}>
            <span className={`${styles.thresholdDot} ${styles.thresholdDotSuccess}`}>●</span>
            <span className={styles.thresholdLabel}>
              <strong>Score ≥{value}:</strong> {t('admin.metadata.autoSearch.autoApplied')}
            </span>
          </div>
          <div className={`${styles.thresholdBox} ${styles.thresholdBoxWarning}`}>
            <span className={`${styles.thresholdDot} ${styles.thresholdDotWarning}`}>●</span>
            <span className={styles.thresholdLabel}>
              <strong>Score 75-{value - 1}:</strong> {t('admin.metadata.autoSearch.manualReview')}
            </span>
          </div>
          <div className={`${styles.thresholdBox} ${styles.thresholdBoxMuted}`}>
            <span className={`${styles.thresholdDot} ${styles.thresholdDotMuted}`}>●</span>
            <span className={styles.thresholdLabel}>
              <strong>Score &lt;75:</strong> {t('admin.metadata.autoSearch.ignored')}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended values */}
      <div className={styles.recommendationsBox}>
        <Info size={16} className={styles.recommendationsIcon} />
        <div>
          <strong>{t('admin.metadata.autoSearch.recommendations')}</strong>
          <ul className={styles.recommendationsList}>
            <li>
              <strong>{t('admin.metadata.autoSearch.conservative')}</strong>{' '}
              {t('admin.metadata.autoSearch.conservativeDesc')}
            </li>
            <li>
              <strong>{t('admin.metadata.autoSearch.recommendedValue')}</strong>{' '}
              {t('admin.metadata.autoSearch.recommendedDesc')}
            </li>
            <li>
              <strong>{t('admin.metadata.autoSearch.aggressive')}</strong>{' '}
              {t('admin.metadata.autoSearch.aggressiveDesc')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
