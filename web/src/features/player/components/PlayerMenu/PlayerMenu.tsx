import { MoreVertical } from 'lucide-react';
import { usePlayerSettingsStore, type PlayerPreference } from '../../store';
import { usePlayer } from '../../context/PlayerContext';
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

  const handleOptionClick = (value: PlayerPreference) => {
    setPreference(value);
    onClose();
  };

  const handleCrossfadeToggle = () => {
    setCrossfadeEnabled(!crossfade.enabled);
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
        </div>
      )}
    </div>
  );
}
