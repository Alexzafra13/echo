/**
 * Providers Tab - Container Component
 *
 * Manages external metadata providers configuration.
 * Uses React Query for server state and presentational components for UI.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button, InlineNotification } from '@shared/components/ui';
import { useNotification } from '@shared/hooks';
import { useMetadataSettings, useUpdateMetadataSettings, useValidateApiKey } from '../../hooks';
import { ProviderCard } from './ProviderCard';
import { AutoEnrichToggle } from './AutoEnrichToggle';
import { PROVIDER_BRANDING } from '../../constants/providerBranding';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './ProvidersTab.module.css';

export function ProvidersTab() {
  const { t } = useTranslation();
  // React Query hooks
  const { data: settings, isLoading, error } = useMetadataSettings();
  const updateSettings = useUpdateMetadataSettings();
  const validateApiKey = useValidateApiKey();

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
      setValidationResults((prev) => ({ ...prev, lastfm: result }));
    } catch (err) {
      setValidationResults((prev) => ({
        ...prev,
        lastfm: {
          valid: false,
          message: getApiErrorMessage(err, t('admin.metadata.providersTab.validateError')),
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
      setValidationResults((prev) => ({ ...prev, fanart: result }));
    } catch (err) {
      setValidationResults((prev) => ({
        ...prev,
        fanart: {
          valid: false,
          message: getApiErrorMessage(err, t('admin.metadata.providersTab.validateError')),
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
          showSuccess(t('admin.metadata.providersTab.configSaved'));
        },
        onError: (err) => {
          showError(getApiErrorMessage(err, t('admin.metadata.providersTab.saveError')));
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
          showSuccess(
            enabled
              ? t('admin.metadata.providersTab.autoEnrichEnabled')
              : t('admin.metadata.providersTab.autoEnrichDisabled')
          );
        },
        onError: (err) => {
          showError(getApiErrorMessage(err, t('admin.metadata.providersTab.autoEnrichError')));
        },
      }
    );
  };

  if (isLoading) {
    return <div className={styles.loading}>{t('admin.metadata.providersTab.loadingConfig')}</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <AlertCircle size={24} />
        <p>{t('admin.metadata.providersTab.loadError')}</p>
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
        <h3 className={styles.sectionTitle}>{t('admin.metadata.providersTab.title')}</h3>
        <p className={styles.sectionDescription}>{t('admin.metadata.providersTab.description')}</p>

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
            <strong>{t('admin.metadata.providersTab.infoNote')}</strong>
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          loading={updateSettings.isPending}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending
            ? t('admin.metadata.providersTab.saving')
            : t('admin.metadata.providersTab.saveConfig')}
        </Button>
      </div>
    </div>
  );
}
