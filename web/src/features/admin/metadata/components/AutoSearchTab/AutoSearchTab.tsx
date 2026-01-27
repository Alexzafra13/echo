/**
 * Auto-Search Tab Component (Refactored)
 *
 * Container for auto-search configuration with clean architecture
 */

import { useState, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { Button, CollapsibleInfo, InlineNotification } from '@shared/components/ui';
import type { NotificationType } from '@shared/components/ui';
import { useAutoSearchConfig } from '../../hooks/queries/useAutoSearchConfig';
import { useUpdateAutoSearchConfig } from '../../hooks/mutations/useUpdateAutoSearchConfig';
import { useAutoSearchStats } from '../../hooks/queries/useAutoSearchStats';
import { AutoSearchToggle } from './AutoSearchToggle';
import { ConfidenceSlider } from './ConfidenceSlider';
import { AutoSearchStatsDisplay } from './AutoSearchStatsDisplay';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './AutoSearchTab.module.css';

/**
 * Auto-search configuration tab
 */
export function AutoSearchTab() {
  // React Query hooks
  const { data: config, isLoading } = useAutoSearchConfig();
  const { data: stats } = useAutoSearchStats();
  const updateConfig = useUpdateAutoSearchConfig();

  // Local form state
  const [enabled, setEnabled] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(95);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  // Sync config to local state when loaded
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setConfidenceThreshold(config.confidenceThreshold);
    }
  }, [config]);

  const handleSave = () => {
    setNotification(null);
    updateConfig.mutate(
      {
        enabled,
        confidenceThreshold,
      },
      {
        onSuccess: () => {
          setNotification({ type: 'success', message: 'Configuración guardada correctamente' });
        },
        onError: (err) => {
          setNotification({
            type: 'error',
            message: getApiErrorMessage(err, 'Error al guardar configuración'),
          });
        },
      }
    );
  };

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
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Search size={20} />
          <h3 className={styles.sectionTitle}>Auto-búsqueda de MusicBrainz IDs</h3>
        </div>
        <p className={styles.sectionDescription}>
          Busca automáticamente MusicBrainz IDs durante el escaneo de biblioteca cuando las etiquetas
          no los contienen. Similar a cómo funciona MusicBrainz Picard.
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <AutoSearchToggle
        enabled={enabled}
        onChange={setEnabled}
        disabled={updateConfig.isPending}
      />

      {/* Confidence Threshold Slider */}
      {enabled && (
        <ConfidenceSlider
          value={confidenceThreshold}
          onChange={setConfidenceThreshold}
          disabled={updateConfig.isPending}
        />
      )}

      {/* Statistics */}
      {stats && <AutoSearchStatsDisplay stats={stats} />}

      {/* Info Box */}
      <CollapsibleInfo
        title="¿Cómo funciona?"
        defaultExpanded={false}
        className={styles.infoBoxSpacing}
      >
        <ul>
          <li>Durante el scan, busca MBIDs en MusicBrainz para entidades sin MBID en tags</li>
          <li>Usa búsqueda multi-campo (artista + álbum + track + duración + ISRC)</li>
          <li>Coincidencias de alta confianza se aplican automáticamente</li>
          <li>
            Coincidencias medias te permiten elegir entre múltiples opciones (estilo Picard)
          </li>
          <li>Los MBIDs correctos mejoran el enriquecimiento (Fanart.tv requiere MBIDs)</li>
        </ul>
      </CollapsibleInfo>

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
          autoHideMs={3000}
        />
      )}

      {/* Save Button */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={updateConfig.isPending}
          disabled={updateConfig.isPending}
          leftIcon={<Check size={16} />}
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
