import { useState, useEffect } from 'react';
import { Download, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './SettingsPage.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * InstallAppCard Component
 * Shows an "Install Echo" option in Settings when the browser supports PWA installation.
 * Only renders when the app is installable (not already installed, browser supports it).
 */
export function InstallAppCard() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setInstallPrompt(null);
  };

  // Don't render if already installed as PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  // Don't render if browser doesn't support install prompt
  if (!installPrompt && !installed) {
    return null;
  }

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2>
          <Download size={20} /> {t('settings.installApp.title', 'Install app')}
        </h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>
              {installed
                ? t('settings.installApp.installed', 'Echo has been installed')
                : t('settings.installApp.label', 'Install Echo on your device')}
            </span>
            <p className={styles.settingsPage__toggleDescription}>
              {installed
                ? t('settings.installApp.installedDesc', 'You can now launch Echo from your home screen or app launcher.')
                : t('settings.installApp.description', 'Get a native app experience with quick access from your home screen.')}
            </p>
          </div>
          {!installed && (
            <button
              onClick={handleInstall}
              style={{
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Download size={16} />
              {t('settings.installApp.button', 'Install')}
            </button>
          )}
          {installed && <Check size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />}
        </div>
      </div>
    </div>
  );
}
