import { Music } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@shared/components/ui';
import { usePlayback, useAutoplayContext } from '@features/player';
import { usePlayerSettingsStore } from '@features/player/store/playerSettingsStore';
import styles from './SettingsPage.module.css';

const CROSSFADE_MIN_S = 1;
const CROSSFADE_MAX_S = 12;

export function PlaybackCard() {
  const { t } = useTranslation();
  const {
    crossfade,
    setCrossfadeEnabled,
    setCrossfadeDuration,
    setCrossfadeSmartMode,
    setCrossfadeTempoMatch,
    normalization,
    setNormalizationEnabled,
    volumeControlSupported,
  } = usePlayback();
  const { autoplay, setAutoplayEnabled } = useAutoplayContext();
  const djModeEnabled = usePlayerSettingsStore((s) => s.djMode.enabled);
  const setDjModeEnabled = usePlayerSettingsStore((s) => s.setDjModeEnabled);

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
                  <label className={styles.settingsPage__toggleLabel} htmlFor="crossfade-duration">
                    {t('settings.playback.crossfadeDuration')}
                  </label>
                  <p className={styles.settingsPage__toggleDescription}>
                    {t('settings.playback.crossfadeDurationDescription')}
                  </p>
                </div>
                <div className={styles.settingsPage__range}>
                  <input
                    id="crossfade-duration"
                    type="range"
                    min={CROSSFADE_MIN_S}
                    max={CROSSFADE_MAX_S}
                    step={1}
                    value={crossfade.duration}
                    onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                    className={styles.settingsPage__rangeInput}
                  />
                  <span className={styles.settingsPage__rangeValue}>
                    {t('settings.playback.crossfadeDurationValue', {
                      seconds: crossfade.duration,
                    })}
                  </span>
                </div>
              </div>
            )}
            {crossfade.enabled && (
              <div className={styles.settingsPage__toggleItem}>
                <div className={styles.settingsPage__toggleInfo}>
                  <span className={styles.settingsPage__toggleLabel}>
                    {t('settings.playback.smartCrossfadeLabel')}
                  </span>
                  <p className={styles.settingsPage__toggleDescription}>
                    {t('settings.playback.smartCrossfadeDescription')}
                  </p>
                </div>
                <Switch
                  checked={crossfade.smartMode}
                  onChange={setCrossfadeSmartMode}
                  aria-label={t('settings.playback.smartCrossfadeLabel')}
                />
              </div>
            )}
            {crossfade.enabled && (
              <div className={styles.settingsPage__toggleItem}>
                <div className={styles.settingsPage__toggleInfo}>
                  <span className={styles.settingsPage__toggleLabel}>
                    {t('settings.playback.tempoMatchLabel')}
                  </span>
                  <p className={styles.settingsPage__toggleDescription}>
                    {t('settings.playback.tempoMatchDescription')}
                  </p>
                </div>
                <Switch
                  checked={crossfade.tempoMatch}
                  onChange={setCrossfadeTempoMatch}
                  aria-label={t('settings.playback.tempoMatchLabel')}
                />
              </div>
            )}
            <div className={styles.settingsPage__toggleItem}>
              <div className={styles.settingsPage__toggleInfo}>
                <span className={styles.settingsPage__toggleLabel}>
                  {t('settings.playback.normalizationLabel')}
                </span>
                <p className={styles.settingsPage__toggleDescription}>
                  {t('settings.playback.normalizationDescription')}
                </p>
              </div>
              <Switch
                checked={normalization.enabled}
                onChange={setNormalizationEnabled}
                aria-label={t('settings.playback.normalizationLabel')}
              />
            </div>
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
              {t('settings.playback.djModeLabel')}
            </span>
            <p className={styles.settingsPage__toggleDescription}>
              {t('settings.playback.djModeDescription')}
            </p>
          </div>
          <Switch
            checked={djModeEnabled}
            onChange={setDjModeEnabled}
            aria-label={t('settings.playback.djModeLabel')}
          />
        </div>
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
