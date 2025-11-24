/**
 * Confidence Slider Component
 *
 * Slider for configuring auto-search confidence threshold with visual feedback
 */

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
  return (
    <div className={styles.section}>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <label className={styles.settingLabel}>Umbral de confianza para auto-aplicación</label>
          <p className={styles.settingDescription}>
            Score mínimo (0-100) para aplicar MBID automáticamente sin confirmación.
          </p>
        </div>
      </div>

      {/* Slider */}
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
          <span
            style={{
              minWidth: '60px',
              textAlign: 'right',
              fontWeight: 600,
              color: 'var(--accent-primary)',
              fontSize: '1.125rem',
            }}
          >
            {value}
          </span>
        </div>

        {/* Threshold explanation */}
        <div
          style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <div
            className={styles.thresholdBox}
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <span style={{ color: '#10b981', fontSize: '1.25rem', lineHeight: 1 }}>●</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              <strong>Score ≥{value}:</strong> Auto-aplicado automáticamente
            </span>
          </div>
          <div
            className={styles.thresholdBox}
            style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.2)',
            }}
          >
            <span style={{ color: '#fbbf24', fontSize: '1.25rem', lineHeight: 1 }}>●</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              <strong>Score 75-{value - 1}:</strong> Crea conflicto para revisión manual
            </span>
          </div>
          <div
            className={styles.thresholdBox}
            style={{
              background: 'rgba(107, 114, 128, 0.08)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: '1.25rem', lineHeight: 1 }}>●</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              <strong>Score &lt;75:</strong> Ignorado (baja confianza)
            </span>
          </div>
        </div>
      </div>

      {/* Recommended values */}
      <div
        style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          display: 'flex',
          gap: '0.5rem',
          fontSize: '0.875rem',
        }}
      >
        <Info
          size={16}
          style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }}
        />
        <div>
          <strong>Recomendaciones:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.25rem', lineHeight: '1.6' }}>
            <li>
              <strong>95 (Conservador):</strong> Máxima seguridad, menos automatización
            </li>
            <li>
              <strong>90 (Recomendado):</strong> Balance entre seguridad y automatización
            </li>
            <li>
              <strong>85 (Agresivo):</strong> Más automatización, puede tener falsos positivos
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
