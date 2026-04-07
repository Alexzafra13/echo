/**
 * Auto-Search Tab Component (Refactored)
 *
 * Container for auto-search configuration with clean architecture
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Button, CollapsibleInfo, InlineNotification } from '@shared/components/ui';
import { useNotification } from '@shared/hooks';
import { useAutoSearchConfig } from '../../hooks/queries/useAutoSearchConfig';
import { useUpdateAutoSearchConfig } from '../../hooks/mutations/useUpdateAutoSearchConfig';
import { useAutoSearchStats } from '../../hooks/queries/useAutoSearchStats';
import { AutoSearchToggle } from './AutoSearchToggle';
import { ConfidenceSlider } from './ConfidenceSlider';
import { AutoSearchStatsDisplay } from './AutoSearchStatsDisplay';
import { PROVIDER_BRANDING } from '../../constants/providerBranding';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './AutoSearchTab.module.css';

/**
 * Auto-search configuration tab
 */
export function AutoSearchTab() {
  const { t } = useTranslation();
  // React Query hooks
  const { data: config, isLoading } = useAutoSearchConfig();
  const { data: stats } = useAutoSearchStats();
  const updateConfig = useUpdateAutoSearchConfig();

  // Local form state
  const [enabled, setEnabled] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(95);
  const { notification, showSuccess, showError, dismiss } = useNotification();

  // Sync config to local state when loaded
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setConfidenceThreshold(config.confidenceThreshold);
    }
  }, [config]);

  const handleSave = () => {
    dismiss();
    updateConfig.mutate(
      {
        enabled,
        confidenceThreshold,
      },
      {
        onSuccess: () => {
          showSuccess(t('admin.metadata.autoSearch.configSaved'));
        },
        onError: (err) => {
          showError(getApiErrorMessage(err, t('admin.metadata.autoSearch.saveError')));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>{t('admin.metadata.autoSearch.loadingConfig')}</p>
      </div>
    );
  }

  return (
    <div className={styles.providersTab}>
      {/* Header */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.mbLogoContainer}>
            <img
              src={PROVIDER_BRANDING.musicbrainz.logoPath}
              alt="MusicBrainz"
              className={styles.mbLogo}
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h3 className={styles.sectionTitle}>{t('admin.metadata.autoSearch.title')}</h3>
        </div>
        <p className={styles.sectionDescription}>{t('admin.metadata.autoSearch.description')}</p>
      </div>

      {/* Enable/Disable Toggle */}
      <AutoSearchToggle enabled={enabled} onChange={setEnabled} disabled={updateConfig.isPending} />

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
        title={t('admin.metadata.autoSearch.howItWorks')}
        defaultExpanded={false}
        className={styles.infoBoxSpacing}
      >
        <ul>
          <li>{t('admin.metadata.autoSearch.howItWorksItem1')}</li>
          <li>{t('admin.metadata.autoSearch.howItWorksItem2')}</li>
          <li>{t('admin.metadata.autoSearch.howItWorksItem3')}</li>
          <li>{t('admin.metadata.autoSearch.howItWorksItem4')}</li>
          <li>{t('admin.metadata.autoSearch.howItWorksItem5')}</li>
        </ul>
      </CollapsibleInfo>

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
          onClick={handleSave}
          loading={updateConfig.isPending}
          disabled={updateConfig.isPending}
          leftIcon={<Check size={16} />}
        >
          {t('admin.metadata.autoSearch.saveChanges')}
        </Button>
      </div>
    </div>
  );
}
