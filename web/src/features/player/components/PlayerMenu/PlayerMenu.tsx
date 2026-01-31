import { MoreVertical, Disc3 } from 'lucide-react';
import { usePlayerSettingsStore, type PlayerPreference } from '../../store';
import { usePlayer } from '../../context/PlayerContext';
import { useDjFlowStore } from '@features/dj/store';
import styles from './PlayerMenu.module.css';

interface PlayerMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
  size?: number;
  strokeWidth?: number;
}

export function PlayerMenu({ isOpen, onToggle, onClose, menuRef, size = 16, strokeWidth = 2 }: PlayerMenuProps) {
  const preference = usePlayerSettingsStore((s) => s.playerPreference);
  const setPreference = usePlayerSettingsStore((s) => s.setPlayerPreference);
  const { crossfade, setCrossfadeEnabled } = usePlayer();
  const djFlowEnabled = useDjFlowStore((s) => s.settings.enabled);
  const toggleDjFlow = useDjFlowStore((s) => s.toggleDjFlow);

  const handleOptionClick = (value: PlayerPreference) => {
    setPreference(value);
    onClose();
  };

  const handleCrossfadeToggle = () => {
    setCrossfadeEnabled(!crossfade.enabled);
  };

  const handleDjFlowToggle = () => {
    toggleDjFlow();
  };

  return (
    <div className={styles.menuContainer} ref={menuRef}>
      <button
        className={`${styles.menuButton} ${isOpen ? styles['menuButton--active'] : ''}`}
        onClick={onToggle}
        title="Opciones del reproductor"
      >
        <MoreVertical size={size} strokeWidth={strokeWidth} />
      </button>

      {isOpen && (
        <div className={styles.menuDropdown}>
          <button
            className={`${styles.menuOption} ${preference === 'dynamic' ? styles['menuOption--active'] : ''}`}
            onClick={() => handleOptionClick('dynamic')}
          >
            Posición dinámica
          </button>
          <button
            className={`${styles.menuOption} ${preference === 'sidebar' ? styles['menuOption--active'] : ''}`}
            onClick={() => handleOptionClick('sidebar')}
          >
            Reproductor lateral
          </button>
          <button
            className={`${styles.menuOption} ${preference === 'footer' ? styles['menuOption--active'] : ''}`}
            onClick={() => handleOptionClick('footer')}
          >
            Reproductor por defecto
          </button>

          <div className={styles.menuSeparator} />

          <button
            className={`${styles.menuOptionToggle} ${crossfade.enabled ? styles['menuOptionToggle--active'] : ''}`}
            onClick={handleCrossfadeToggle}
          >
            <span>Fundido entre canciones</span>
            <span className={`${styles.toggleIndicator} ${crossfade.enabled ? styles['toggleIndicator--active'] : ''}`} />
          </button>

          <button
            className={`${styles.menuOptionToggle} ${djFlowEnabled ? styles['menuOptionToggle--active'] : ''}`}
            onClick={handleDjFlowToggle}
          >
            <span className={styles.djFlowLabel}>
              <Disc3 size={14} />
              DJ Flow
            </span>
            <span className={`${styles.toggleIndicator} ${djFlowEnabled ? styles['toggleIndicator--active'] : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}
