import { Search, Check, AlertCircle, Info } from 'lucide-react';
import { Button, CollapsibleInfo, InlineNotification } from '@shared/components/ui';
import { useAutoSearchConfig } from './useAutoSearchConfig';
import styles from './ProvidersTab.module.css';

/**
 * AutoSearchTab Component
 * Configuración de auto-búsqueda de MusicBrainz IDs (Picard-style)
 */
export function AutoSearchTab() {
  const {
    config,
    stats,
    isLoading,
    isSaving,
    notification,
    updateConfig,
    handleSave,
    dismissNotification,
  } = useAutoSearchConfig();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className={styles.providersTab}>
      {/* Header */}
      <div className={styles.section} style={{ marginBottom: '1.5rem' }}>
        <div className={styles.sectionHeader}>
          <Search size={20} />
          <h3 className={styles.sectionTitle}>Auto-búsqueda de MusicBrainz IDs</h3>
        </div>
        <p className={styles.sectionDescription} style={{ marginTop: '0.75rem', lineHeight: '1.6' }}>
          Busca automáticamente MusicBrainz IDs durante el escaneo de biblioteca cuando las etiquetas no los contienen.
          Similar a cómo funciona MusicBrainz Picard.
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className={styles.section} style={{ marginBottom: '1.5rem' }}>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <label className={styles.settingLabel}>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                className={styles.checkbox}
              />
              <span>Habilitar auto-búsqueda durante el scan</span>
            </label>
            <p className={styles.settingDescription} style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
              Cuando está habilitado, el scanner buscará automáticamente MusicBrainz IDs para artistas, álbumes y tracks
              que no los tengan en sus etiquetas ID3.
            </p>
          </div>
        </div>
      </div>

      {/* Confidence Threshold */}
      {config.enabled && (
        <div className={styles.section} style={{ marginBottom: '1.5rem' }}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <label className={styles.settingLabel}>
                Umbral de confianza para auto-aplicación
              </label>
              <p className={styles.settingDescription} style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
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
                value={config.confidenceThreshold}
                onChange={(e) => updateConfig({ confidenceThreshold: parseInt(e.target.value) })}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  outline: 'none',
                  background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${((config.confidenceThreshold - 75) / 25) * 100}%, var(--border-secondary) ${((config.confidenceThreshold - 75) / 25) * 100}%, var(--border-secondary) 100%)`,
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
                {config.confidenceThreshold}
              </span>
            </div>

            {/* Threshold explanation */}
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className={styles.thresholdBox} style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                flex: '1 1 auto',
                minWidth: '200px',
              }}>
                <span style={{ color: '#10b981', fontSize: '1.25rem', lineHeight: 1 }}>●</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                  <strong>Score ≥{config.confidenceThreshold}:</strong> Auto-aplicado
                </span>
              </div>
              <div className={styles.thresholdBox} style={{
                background: 'rgba(251, 191, 36, 0.08)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                flex: '1 1 auto',
                minWidth: '200px',
              }}>
                <span style={{ color: '#fbbf24', fontSize: '1.25rem', lineHeight: 1 }}>●</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                  <strong>Score 75-{config.confidenceThreshold - 1}:</strong> Revisión manual
                </span>
              </div>
              <div className={styles.thresholdBox} style={{
                background: 'rgba(107, 114, 128, 0.08)',
                border: '1px solid rgba(107, 114, 128, 0.2)',
                flex: '1 1 auto',
                minWidth: '200px',
              }}>
                <span style={{ color: '#6b7280', fontSize: '1.25rem', lineHeight: 1 }}>●</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                  <strong>Score &lt;75:</strong> Ignorado
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
            <Info size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Recomendaciones:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.25rem', lineHeight: '1.6' }}>
                <li><strong>95 (Conservador):</strong> Máxima seguridad, menos automatización</li>
                <li><strong>90 (Recomendado):</strong> Balance entre seguridad y automatización</li>
                <li><strong>85 (Agresivo):</strong> Más automatización, puede tener falsos positivos</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Estadísticas</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
            <div className={styles.statValue}>{stats.autoApplied}</div>
            <div className={styles.statLabel}>Auto-aplicados</div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardWarning}`}>
            <div className={styles.statValue}>{stats.conflictsCreated}</div>
            <div className={styles.statLabel}>Conflictos creados</div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardInfo}`}>
            <div className={styles.statValue}>{stats.ignored}</div>
            <div className={styles.statLabel}>Ignorados</div>
          </div>
        </div>
        {stats.conflictsCreated > 0 && (
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
            Tienes {stats.conflictsCreated} conflictos pendientes de revisión en la pestaña "Metadata"
          </p>
        )}
      </div>

      {/* Info Box */}
      <CollapsibleInfo title="¿Cómo funciona?" defaultExpanded={false} className={styles.infoBoxSpacing}>
        <ul>
          <li>Durante el scan, busca MBIDs en MusicBrainz para entidades sin MBID en tags</li>
          <li>Usa búsqueda multi-campo (artista + álbum + track + duración + ISRC)</li>
          <li>Coincidencias de alta confianza se aplican automáticamente</li>
          <li>Coincidencias medias te permiten elegir entre múltiples opciones (estilo Picard)</li>
          <li>Los MBIDs correctos mejoran el enriquecimiento (Fanart.tv requiere MBIDs)</li>
        </ul>
      </CollapsibleInfo>

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={dismissNotification}
          autoHideMs={3000}
        />
      )}

      {/* Save Button */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isSaving}
          disabled={isSaving}
          leftIcon={<Check size={16} />}
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
