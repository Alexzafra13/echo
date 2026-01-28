/**
 * Providers Tab - Container Component
 *
 * Manages external metadata providers configuration.
 * Uses React Query for server state and presentational components for UI.
 *
 * Reduced from 416 lines to <150 lines through:
 * - Separation of concerns (API, hooks, services, components)
 * - React Query for state management
 * - Presentational components
 * - Service layer for business logic
 */

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, InlineNotification } from '@shared/components/ui';
import { useNotification } from '@shared/hooks';
import {
  useMetadataSettings,
  useUpdateMetadataSettings,
  useValidateApiKey,
} from '../../hooks';
import { ProviderCard } from './ProviderCard';
import { AutoEnrichToggle } from './AutoEnrichToggle';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './ProvidersTab.module.css';

/**
 * ProvidersTab Component
 *
 * Clean container component that orchestrates data fetching,
 * user interactions, and rendering of presentational components.
 */
export function ProvidersTab() {
  // React Query hooks (replaces all useState for server state)
  const { data: settings, isLoading, error } = useMetadataSettings();
  const updateSettings = useUpdateMetadataSettings();
  const validateApiKey = useValidateApiKey();

  // Local form state (only for API keys being edited)
  const [lastfmKey, setLastfmKey] = useState('');
  const [fanartKey, setFanartKey] = useState('');

  // Validation results
  const [validationResults, setValidationResults] = useState<{
    lastfm?: { valid: boolean; message: string };
    fanart?: { valid: boolean; message: string };
  }>({});

  // Inline notifications
  const { notification, showSuccess, showError, dismiss } = useNotification();

  // Sync form state with fetched settings
  useEffect(() => {
    if (settings) {
      setLastfmKey(settings.providers.lastfm.apiKey || '');
      setFanartKey(settings.providers.fanart.apiKey || '');
    }
  }, [settings]);

  // Handlers
  const handleValidateLastfm = async () => {
    try {
      const result = await validateApiKey.mutateAsync({
        service: 'lastfm',
        apiKey: lastfmKey,
      });
      setValidationResults(prev => ({ ...prev, lastfm: result }));
    } catch (err) {
      setValidationResults(prev => ({
        ...prev,
        lastfm: {
          valid: false,
          message: getApiErrorMessage(err, 'Error al validar API key'),
        },
      }));
    }
  };

  const handleValidateFanart = async () => {
    try {
      const result = await validateApiKey.mutateAsync({
        service: 'fanart',
        apiKey: fanartKey,
      });
      setValidationResults(prev => ({ ...prev, fanart: result }));
    } catch (err) {
      setValidationResults(prev => ({
        ...prev,
        fanart: {
          valid: false,
          message: getApiErrorMessage(err, 'Error al validar API key'),
        },
      }));
    }
  };

  const handleSave = () => {
    dismiss();
    updateSettings.mutate(
      {
        providers: {
          lastfm: { apiKey: lastfmKey },
          fanart: { apiKey: fanartKey },
        },
      },
      {
        onSuccess: () => {
          showSuccess('Configuración guardada correctamente');
        },
        onError: (err) => {
          showError(getApiErrorMessage(err, 'Error al guardar configuración'));
        },
      }
    );
  };

  const handleToggleAutoEnrich = (enabled: boolean) => {
    dismiss();
    updateSettings.mutate(
      { autoEnrichEnabled: enabled },
      {
        onSuccess: () => {
          showSuccess(`Auto-enrichment ${enabled ? 'activado' : 'desactivado'}`);
        },
        onError: (err) => {
          showError(getApiErrorMessage(err, 'Error al actualizar configuración'));
        },
      }
    );
  };

  // Loading state
  if (isLoading) {
    return <div className={styles.loading}>Cargando configuración...</div>;
  }

  // Error state
  if (error) {
    return (
      <div className={styles.error}>
        <AlertCircle size={24} />
        <p>Error al cargar la configuración</p>
      </div>
    );
  }

  // No settings (shouldn't happen)
  if (!settings) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Auto-enrichment Toggle */}
      <AutoEnrichToggle
        enabled={settings.autoEnrichEnabled}
        onChange={handleToggleAutoEnrich}
        isUpdating={updateSettings.isPending}
      />

      {/* Providers Section */}
      <div className={styles.providersSection}>
        <h3 className={styles.sectionTitle}>Proveedores de Metadata</h3>
        <p className={styles.sectionDescription}>
          Configura los proveedores externos para obtener metadata de artistas y álbumes
        </p>

        {/* Cover Art Archive - Always enabled */}
        <ProviderCard
          name="Cover Art Archive"
          description="Portadas de álbumes de alta calidad (no requiere API key)"
          enabled={true}
          requiresApiKey={false}
        />

        {/* Last.fm */}
        <ProviderCard
          name="Last.fm"
          description="Biografías de artistas y álbumes"
          enabled={settings.providers.lastfm.enabled}
          requiresApiKey={true}
          apiKey={lastfmKey}
          onApiKeyChange={setLastfmKey}
          onValidate={handleValidateLastfm}
          validationResult={validationResults.lastfm}
          isValidating={validateApiKey.isPending}
          apiKeyUrl="https://www.last.fm/api/account/create"
        />

        {/* Fanart.tv */}
        <ProviderCard
          name="Fanart.tv"
          description="Imágenes de artistas y portadas de álbumes"
          enabled={settings.providers.fanart.enabled}
          requiresApiKey={true}
          apiKey={fanartKey}
          onApiKeyChange={setFanartKey}
          onValidate={handleValidateFanart}
          validationResult={validationResults.fanart}
          isValidating={validateApiKey.isPending}
          apiKeyUrl="https://fanart.tv/get-an-api-key/"
        />
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <AlertCircle size={16} />
        <p>
          <strong>Nota:</strong> Cover Art Archive está siempre activado y no requiere
          configuración. Last.fm y Fanart.tv requieren API keys gratuitas que puedes
          obtener creando una cuenta.
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onDismiss={dismiss}
          autoHideMs={3000}
        />
      )}

      {/* Save Button */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          loading={updateSettings.isPending}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </div>
  );
}
