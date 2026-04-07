import { Database, Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@shared/components/ui';
import { useLibraryAnalysisSettings } from '../../hooks/useLibraryAnalysisSettings';
import styles from './SettingsPage.module.css';

export function LibraryAnalysisCard() {
  const { t } = useTranslation();
  const { lufsEnabled, djEnabled, setLufsEnabled, setDjEnabled, isLoading } =
    useLibraryAnalysisSettings();

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2>
          <Database size={20} /> {t('settings.libraryAnalysis.title')}
        </h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        <div className={styles.settingsPage__infoNote}>
          <Music size={16} />
          <span>{t('settings.libraryAnalysis.description')}</span>
        </div>
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>
              {t('settings.libraryAnalysis.lufs')}
            </span>
            <p className={styles.settingsPage__toggleDescription}>
              {t('settings.libraryAnalysis.lufsDescription')}
            </p>
          </div>
          <Switch
            checked={lufsEnabled}
            onChange={setLufsEnabled}
            disabled={isLoading}
            aria-label={t('settings.libraryAnalysis.lufs')}
          />
        </div>
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>
              {t('settings.libraryAnalysis.dj')}
            </span>
            <p className={styles.settingsPage__toggleDescription}>
              {t('settings.libraryAnalysis.djDescription')}
            </p>
          </div>
          <Switch
            checked={djEnabled}
            onChange={setDjEnabled}
            disabled={isLoading}
            aria-label={t('settings.libraryAnalysis.dj')}
          />
        </div>
      </div>
    </div>
  );
}
