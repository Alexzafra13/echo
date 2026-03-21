import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@shared/hooks';
import styles from './SettingsPage.module.css';

export function AppearanceCard() {
  const { themePreference, setThemePreference, theme } = useTheme();

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2><Palette size={20} /> Apariencia</h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        <div className={styles.settingsPage__toggleItem}>
          <div className={styles.settingsPage__toggleInfo}>
            <span className={styles.settingsPage__toggleLabel}>Tema</span>
            <p className={styles.settingsPage__toggleDescription}>Elige cómo quieres que se vea la aplicación</p>
          </div>
        </div>
        <div className={styles.settingsPage__themeSelector}>
          <button type="button" className={`${styles.settingsPage__themeOption} ${themePreference === 'auto' ? styles['settingsPage__themeOption--active'] : ''}`} onClick={() => setThemePreference('auto')}>
            <Monitor size={20} />
            <span className={styles.settingsPage__themeOptionLabel}>Automático</span>
            <span className={styles.settingsPage__themeOptionDesc}>Según tu dispositivo</span>
          </button>
          <button type="button" className={`${styles.settingsPage__themeOption} ${themePreference === 'light' ? styles['settingsPage__themeOption--active'] : ''}`} onClick={() => setThemePreference('light')}>
            <Sun size={20} />
            <span className={styles.settingsPage__themeOptionLabel}>Claro</span>
            <span className={styles.settingsPage__themeOptionDesc}>Tema claro siempre</span>
          </button>
          <button type="button" className={`${styles.settingsPage__themeOption} ${themePreference === 'dark' ? styles['settingsPage__themeOption--active'] : ''}`} onClick={() => setThemePreference('dark')}>
            <Moon size={20} />
            <span className={styles.settingsPage__themeOptionLabel}>Oscuro</span>
            <span className={styles.settingsPage__themeOptionDesc}>Tema oscuro siempre</span>
          </button>
        </div>
        {themePreference === 'auto' && (
          <p className={styles.settingsPage__themeNote}>
            Actualmente usando tema {theme === 'dark' ? 'oscuro' : 'claro'} según tu dispositivo
          </p>
        )}
      </div>
    </div>
  );
}
