import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@shared/components/layout/Sidebar';
import { useDocumentTitle } from '@shared/hooks';
import { HomePersonalizationCard } from './HomePersonalizationCard';
import { AppearanceCard } from './AppearanceCard';
import { LibraryAnalysisCard } from './LibraryAnalysisCard';
import { PlaybackCard } from './PlaybackCard';
import { NotificationsCard } from './NotificationsCard';
import { InstallAppCard } from './InstallAppCard';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t('settings.pageTitle'));

  return (
    <div className={styles.settingsPage}>
      <Sidebar />
      <main className={styles.settingsPage__main}>
        <Header showBackButton disableSearch />
        <div className={styles.settingsPage__content}>
          <div className={styles.settingsPage__contentInner}>
            <div className={styles.settingsPage__header}>
              <div className={styles.settingsPage__headerIcon}>
                <Settings size={28} />
              </div>
              <div>
                <h1>{t('settings.title')}</h1>
                <p className={styles.settingsPage__subtitle}>{t('settings.subtitle')}</p>
              </div>
            </div>

            <HomePersonalizationCard />
            <AppearanceCard />

            <div className={styles.settingsPage__card}>
              <div className={styles.settingsPage__cardHeader}>
                <h2>
                  <span style={{ display: 'inline-flex' }}>🌐</span> {t('settings.language')}
                </h2>
              </div>
              <div className={styles.settingsPage__cardBody}>
                <div className={styles.settingsPage__toggleItem}>
                  <div className={styles.settingsPage__toggleInfo}>
                    <span className={styles.settingsPage__toggleLabel}>
                      {t('settings.languageLabel')}
                    </span>
                    <p className={styles.settingsPage__toggleDescription}>
                      {t('settings.languageDesc')}
                    </p>
                  </div>
                  <select
                    value={i18n.language}
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className={styles.settingsPage__select}
                  >
                    <option value="es">{t('settings.spanish')}</option>
                    <option value="en">{t('settings.english')}</option>
                    <option value="fr">{t('settings.french')}</option>
                  </select>
                </div>
              </div>
            </div>

            <LibraryAnalysisCard />
            <PlaybackCard />
            <NotificationsCard />
            <InstallAppCard />

            <div className={styles.settingsPage__about}>
              <img
                src="/images/logos/echo_dark.svg"
                alt="Echo"
                className={styles.settingsPage__aboutLogo}
              />
              <span className={styles.settingsPage__aboutVersion}>v{__APP_VERSION__}</span>
              <p className={styles.settingsPage__aboutDesc}>{t('settings.aboutDesc')}</p>
              <a
                href="https://github.com/Alexzafra13/echo"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.settingsPage__aboutLink}
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
