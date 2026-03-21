import { Database, Music } from 'lucide-react';
import { Switch } from '@shared/components/ui';
import { useLibraryAnalysisSettings } from '../../hooks/useLibraryAnalysisSettings';
import styles from './SettingsPage.module.css';

export function LibraryAnalysisCard() {
  const { lufsEnabled, djEnabled, setLufsEnabled, setDjEnabled, isLoading } =
    useLibraryAnalysisSettings();

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2><Database size={20} /> Análisis de Librería</h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        <div className={styles.settingsPage__infoNote}>
          <Music size={16} />
          <span>
            Estos análisis se ejecutan automáticamente después de cada escaneo de librería.
            Desactívalos si prefieres ahorrar tiempo de procesamiento.
          </span>
        </div>
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>Análisis LUFS</span>
            <p className={styles.settingsPage__toggleDescription}>
              Calcula los niveles de volumen (ReplayGain) para normalización de audio
            </p>
          </div>
          <Switch checked={lufsEnabled} onChange={setLufsEnabled} disabled={isLoading} aria-label="Análisis LUFS" />
        </div>
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>Análisis DJ</span>
            <p className={styles.settingsPage__toggleDescription}>
              Detecta BPM, tonalidad (Key) y energía para sugerencias de mezcla armónica
            </p>
          </div>
          <Switch checked={djEnabled} onChange={setDjEnabled} disabled={isLoading} aria-label="Análisis DJ" />
        </div>
      </div>
    </div>
  );
}
