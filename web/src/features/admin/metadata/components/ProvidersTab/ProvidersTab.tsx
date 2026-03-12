/**
 * Providers Tab - Container Component
 *
 * Manages external metadata providers configuration.
 * Uses React Query for server state and presentational components for UI.
 */

import { useState, useEffect } from 'react';
import { AlertCircle, Radio, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button, InlineNotification } from '@shared/components/ui';
import { useNotification } from '@shared/hooks';
import { formatBytes } from '@shared/utils/format';
import {
  useMetadataSettings,
  useUpdateMetadataSettings,
  useValidateApiKey,
} from '../../hooks';
import { radioFaviconsApi } from '@features/admin/api/radio-favicons.api';
import { ProviderCard } from './ProviderCard';
import { AutoEnrichToggle } from './AutoEnrichToggle';
import { PROVIDER_BRANDING } from '../../constants/providerBranding';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './ProvidersTab.module.css';

const SOURCE_LABELS: Record<string, string> = {
  'apple-touch-icon': 'Apple Touch Icon',
  'google-favicon': 'Google Favicon',
  'wikipedia': 'Wikipedia',
  'manual': 'Subida manual',
};

export function ProvidersTab() {
  // React Query hooks
  const { data: settings, isLoading, error } = useMetadataSettings();
  const updateSettings = useUpdateMetadataSettings();
  const validateApiKey = useValidateApiKey();

  const { data: faviconStats } = useQuery({
    queryKey: ['admin', 'radio', 'favicon-stats'],
    queryFn: () => radioFaviconsApi.getStats(),
    staleTime: 60_000,
  });

  // Local form state
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
          showSuccess('Configuracion guardada correctamente');
        },
        onError: (err) => {
          showError(getApiErrorMessage(err, 'Error al guardar configuracion'));
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
          showError(getApiErrorMessage(err, 'Error al actualizar configuracion'));
        },
      }
    );
  };

  if (isLoading) {
    return <div className={styles.loading}>Cargando configuracion...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <AlertCircle size={24} />
        <p>Error al cargar la configuracion</p>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  const mb = PROVIDER_BRANDING.musicbrainz;
  const caa = PROVIDER_BRANDING.coverartarchive;
  const lfm = PROVIDER_BRANDING.lastfm;
  const fa = PROVIDER_BRANDING.fanart;

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
          Configura los proveedores externos para obtener metadata de artistas y albumes
        </p>

        <div className={styles.providersGrid}>
          {/* MusicBrainz - Always enabled */}
          <ProviderCard
            name={mb.name}
            description={mb.description}
            enabled={true}
            requiresApiKey={false}
            logoPath={mb.logoPath}
            brandColor={mb.brandColor}
            brandColorRgb={mb.brandColorRgb}
          />

          {/* Cover Art Archive - Always enabled */}
          <ProviderCard
            name={caa.name}
            description={caa.description}
            enabled={true}
            requiresApiKey={false}
            logoPath={caa.logoPath}
            brandColor={caa.brandColor}
            brandColorRgb={caa.brandColorRgb}
          />

          {/* Last.fm */}
          <ProviderCard
            name={lfm.name}
            description={lfm.description}
            enabled={settings.providers.lastfm.enabled}
            requiresApiKey={true}
            apiKey={lastfmKey}
            onApiKeyChange={setLastfmKey}
            onValidate={handleValidateLastfm}
            validationResult={validationResults.lastfm}
            isValidating={validateApiKey.isPending}
            apiKeyUrl={lfm.apiKeyUrl}
            logoPath={lfm.logoPath}
            brandColor={lfm.brandColor}
            brandColorRgb={lfm.brandColorRgb}
          />

          {/* Fanart.tv */}
          <ProviderCard
            name={fa.name}
            description={fa.description}
            enabled={settings.providers.fanart.enabled}
            requiresApiKey={true}
            apiKey={fanartKey}
            onApiKeyChange={setFanartKey}
            onValidate={handleValidateFanart}
            validationResult={validationResults.fanart}
            isValidating={validateApiKey.isPending}
            apiKeyUrl={fa.apiKeyUrl}
            logoPath={fa.logoPath}
            brandColor={fa.brandColor}
            brandColorRgb={fa.brandColorRgb}
          />
        </div>
      </div>

      {/* Radio Favicon Sources */}
      <div className={styles.radioFaviconSection}>
        <div className={styles.radioFaviconHeader}>
          <Radio size={20} />
          <div>
            <h3 className={styles.sectionTitle}>Favicons de Radio</h3>
            <p className={styles.sectionDescription}>
              Los iconos de las emisoras se obtienen automaticamente de estas fuentes (sin configuracion necesaria)
            </p>
          </div>
        </div>

        {faviconStats && faviconStats.totalCount > 0 && (
          <div className={styles.radioFaviconStats}>
            <div className={styles.radioFaviconStatItem}>
              <span className={styles.radioFaviconStatLabel}>Total</span>
              <span className={styles.radioFaviconStatValue}>{faviconStats.totalCount}</span>
            </div>
            <div className={styles.radioFaviconStatItem}>
              <span className={styles.radioFaviconStatLabel}>Tamaño</span>
              <span className={styles.radioFaviconStatValue}>{formatBytes(faviconStats.totalSize)}</span>
            </div>
          </div>
        )}

        <div className={styles.radioSourcesList}>
          {[
            { key: 'apple-touch-icon', logo: PROVIDER_BRANDING['apple-touch-icon']?.logoPath, fallbackIcon: null, desc: 'Icono estandar que las webs publican para dispositivos Apple (ej. /apple-touch-icon.png)', priority: 1 },
            { key: 'google-favicon', logo: PROVIDER_BRANDING['google-favicon']?.logoPath, fallbackIcon: null, desc: 'Servicio publico de Google que devuelve el favicon de cualquier dominio', priority: 2 },
            { key: 'wikipedia', logo: PROVIDER_BRANDING.wikipedia?.logoPath, fallbackIcon: null, desc: 'Busca el logo de la emisora en su articulo de Wikipedia (API publica)', priority: 3 },
            { key: 'manual', logo: null, fallbackIcon: <Upload size={16} />, desc: 'Favicons subidos manualmente por el administrador', priority: 4 },
          ].map((source) => {
            const stat = faviconStats?.bySource.find((s) => s.source === source.key);
            return (
              <div key={source.key} className={styles.radioSource}>
                <div className={styles.radioSourceIcon}>
                  {source.logo ? (
                    <img src={source.logo} alt={SOURCE_LABELS[source.key]} className={styles.radioSourceLogo} />
                  ) : (
                    source.fallbackIcon
                  )}
                </div>
                <div className={styles.radioSourceInfo}>
                  <span className={styles.radioSourceName}>{SOURCE_LABELS[source.key]}</span>
                  <span className={styles.radioSourceDesc}>{source.desc}</span>
                </div>
                {stat && stat.count > 0 && (
                  <span className={styles.radioSourceCount}>
                    {stat.count} ({formatBytes(stat.totalSize)})
                  </span>
                )}
                <span className={styles.radioSourcePriority}>Prioridad {source.priority}</span>
              </div>
            );
          })}
        </div>
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

      {/* Footer: Info + Save */}
      <div className={styles.footer}>
        <div className={styles.infoBox}>
          <AlertCircle size={16} />
          <p>
            <strong>Nota:</strong> MusicBrainz y Cover Art Archive estan siempre activos y no
            requieren configuracion. Last.fm y Fanart.tv requieren API keys gratuitas que puedes
            obtener creando una cuenta.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          loading={updateSettings.isPending}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? 'Guardando...' : 'Guardar Configuracion'}
        </Button>
      </div>
    </div>
  );
}
