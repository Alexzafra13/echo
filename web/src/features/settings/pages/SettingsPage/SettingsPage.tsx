import { Settings } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useDocumentTitle } from '@shared/hooks';
import { HomePersonalizationCard } from './HomePersonalizationCard';
import { AppearanceCard } from './AppearanceCard';
import { LibraryAnalysisCard } from './LibraryAnalysisCard';
import { PlaybackCard } from './PlaybackCard';
import { NotificationsCard } from './NotificationsCard';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  useDocumentTitle('Ajustes');

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
                <h1>Configuración</h1>
                <p className={styles.settingsPage__subtitle}>Personaliza tu experiencia</p>
              </div>
            </div>

            <HomePersonalizationCard />
            <AppearanceCard />

            {/* Idioma — placeholder para futura implementación */}
            <div className={styles.settingsPage__card}>
              <div className={styles.settingsPage__cardHeader}>
                <h2><span style={{ display: 'inline-flex' }}>🌐</span> Idioma</h2>
              </div>
              <div className={styles.settingsPage__cardBody}>
                <div className={styles.settingsPage__toggleItem}>
                  <div className={styles.settingsPage__toggleInfo}>
                    <span className={styles.settingsPage__toggleLabel}>Idioma de la interfaz</span>
                    <p className={styles.settingsPage__toggleDescription}>
                      Selecciona el idioma en el que deseas ver la aplicación
                    </p>
                  </div>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Español</span>
                </div>
              </div>
            </div>

            <LibraryAnalysisCard />
            <PlaybackCard />
            <NotificationsCard />
          </div>
        </div>
      </main>
    </div>
  );
}
