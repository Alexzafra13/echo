import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/hooks';
import styles from './SettingsPage.module.css';

export function AppearanceCard() {
  const { t } = useTranslation();
  const { themePreference, setThemePreference, theme } = useTheme();

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2>
          <Palette size={20} /> {t('settings.appearance.title')}
        </h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>
              {t('settings.appearance.themeLabel')}
            </span>
            <p className={styles.settingsPage__toggleDescription}>
              {t('settings.appearance.themeDescription')}
            </p>
          </div>
        </div>
        <div className={styles.settingsPage__themeSelector}>
          <button
            type="button"
            className={`${styles.settingsPage__themeOption} ${themePreference === 'auto' ? styles['settingsPage__themeOption--active'] : ''}`}
            onClick={() => setThemePreference('auto')}
          >
            <Monitor size={20} />
            <span className={styles.settingsPage__themeOptionLabel}>
              {t('settings.appearance.auto')}
            </span>
            <span className={styles.settingsPage__themeOptionDesc}>
              {t('settings.appearance.autoDesc')}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.settingsPage__themeOption} ${themePreference === 'light' ? styles['settingsPage__themeOption--active'] : ''}`}
            onClick={() => setThemePreference('light')}
          >
            <Sun size={20} />
            <span className={styles.settingsPage__themeOptionLabel}>
              {t('settings.appearance.light')}
            </span>
            <span className={styles.settingsPage__themeOptionDesc}>
              {t('settings.appearance.lightDesc')}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.settingsPage__themeOption} ${themePreference === 'dark' ? styles['settingsPage__themeOption--active'] : ''}`}
            onClick={() => setThemePreference('dark')}
          >
            <Moon size={20} />
            <span className={styles.settingsPage__themeOptionLabel}>
              {t('settings.appearance.dark')}
            </span>
            <span className={styles.settingsPage__themeOptionDesc}>
              {t('settings.appearance.darkDesc')}
            </span>
          </button>
        </div>
        {themePreference === 'auto' && (
          <p className={styles.settingsPage__themeNote}>
            {theme === 'dark'
              ? t('settings.appearance.currentDark')
              : t('settings.appearance.currentLight')}
          </p>
        )}
      </div>
    </div>
  );
}
