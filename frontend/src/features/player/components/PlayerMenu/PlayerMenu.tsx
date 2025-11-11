import { MoreVertical } from 'lucide-react';
import { usePlayerPreference } from '../../hooks/usePlayerPreference';
import type { PlayerPreference } from '../../hooks/usePlayerPreference';
import styles from './PlayerMenu.module.css';

interface PlayerMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
  size?: number;
}

export function PlayerMenu({ isOpen, onToggle, onClose, menuRef, size = 16 }: PlayerMenuProps) {
  const { preference, setPreference } = usePlayerPreference();

  const handleOptionClick = (value: PlayerPreference) => {
    setPreference(value);
    onClose();
  };

  return (
    <div className={styles.menuContainer} ref={menuRef}>
      <button
        className={`${styles.menuButton} ${isOpen ? styles['menuButton--active'] : ''}`}
        onClick={onToggle}
        title="Opciones del reproductor"
      >
        <MoreVertical size={size} />
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
        </div>
      )}
    </div>
  );
}
