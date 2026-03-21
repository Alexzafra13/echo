import { Music } from 'lucide-react';
import { Switch } from '@shared/components/ui';
import { usePlayer } from '@features/player';
import styles from './SettingsPage.module.css';

export function PlaybackCard() {
  const { crossfade, setCrossfadeEnabled, autoplay, setAutoplayEnabled, volumeControlSupported } =
    usePlayer();

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2><Music size={20} /> Reproducción</h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        {volumeControlSupported ? (
          <>
            <div className={styles.settingsPage__toggleItem}>
              <div className={styles.settingsPage__toggleInfo}>
                <span className={styles.settingsPage__toggleLabel}>Fundido entre canciones</span>
                <p className={styles.settingsPage__toggleDescription}>
                  Transición suave entre canciones con fundido de audio (crossfade)
                </p>
              </div>
              <Switch checked={crossfade.enabled} onChange={setCrossfadeEnabled} aria-label="Fundido entre canciones" />
            </div>
            {crossfade.enabled && (
              <div className={styles.settingsPage__toggleItem}>
                <div className={styles.settingsPage__toggleInfo}>
                  <p className={styles.settingsPage__toggleDescription}>
                    Transición automática de 2 segundos entre canciones
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.settingsPage__toggleItem}>
            <div className={styles.settingsPage__toggleInfo}>
              <span className={styles.settingsPage__toggleLabel}>Fundido entre canciones</span>
              <p className={styles.settingsPage__toggleDescription}>
                No disponible en este dispositivo. iOS no permite controlar el volumen desde la web,
                lo que impide realizar fundidos de audio. Se utiliza transición sin cortes (gapless)
                automáticamente.
              </p>
            </div>
          </div>
        )}
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>Reproducción automática</span>
            <p className={styles.settingsPage__toggleDescription}>
              Cuando termina un álbum o playlist, continúa automáticamente con artistas similares
            </p>
          </div>
          <Switch checked={autoplay.enabled} onChange={setAutoplayEnabled} aria-label="Reproducción automática" />
        </div>
      </div>
    </div>
  );
}
