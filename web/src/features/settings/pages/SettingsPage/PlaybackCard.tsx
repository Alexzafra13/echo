import { Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@shared/components/ui';
import { usePlayback, useAutoplayContext } from '@features/player';
import styles from './SettingsPage.module.css';

export function PlaybackCard() {
  const { t } = useTranslation();
  const { crossfade, setCrossfadeEnabled, volumeControlSupported } = usePlayback();
  const { autoplay, setAutoplayEnabled } = useAutoplayContext();

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2>
          <Music size={20} /> {t('settings.playback.title')}
        </h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        {volumeControlSupported ? (
          <>
            <div className={styles.settingsPage__toggleItem}>
              <div className={styles.settingsPage__toggleInfo}>
                <span className={styles.settingsPage__toggleLabel}>
                  {t('settings.playback.crossfadeLabel')}
                </span>
                <p className={styles.settingsPage__toggleDescription}>
                  {t('settings.playback.crossfadeDescription')}
                </p>
              </div>
              <Switch
                checked={crossfade.enabled}
                onChange={setCrossfadeEnabled}
                aria-label={t('settings.playback.crossfadeLabel')}
              />
            </div>
            {crossfade.enabled && (
              <div className={styles.settingsPage__toggleItem}>
                <div className={styles.settingsPage__toggleInfo}>
                  <p className={styles.settingsPage__toggleDescription}>
                    {t('settings.playback.crossfadeAuto')}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.settingsPage__toggleItem}>
            <div className={styles.settingsPage__toggleInfo}>
              <span className={styles.settingsPage__toggleLabel}>
                {t('settings.playback.crossfadeLabel')}
              </span>
              <p className={styles.settingsPage__toggleDescription}>
                {t('settings.playback.unavailable')}
              </p>
            </div>
          </div>
        )}
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>
              {t('settings.playback.autoplayLabel')}
            </span>
            <p className={styles.settingsPage__toggleDescription}>
              {t('settings.playback.autoplayDescription')}
            </p>
          </div>
          <Switch
            checked={autoplay.enabled}
            onChange={setAutoplayEnabled}
            aria-label={t('settings.playback.autoplayLabel')}
          />
        </div>
      </div>
    </div>
  );
}
