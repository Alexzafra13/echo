import { useState, useEffect, useRef as useReactRef } from 'react';
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
  const { crossfade, setCrossfadeEnabled, volumeControlSupported } = usePlayer();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingTimer = useReactRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      // Start close animation
      setClosing(true);
      closingTimer.current = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 200); // Match animation duration
    }
    return () => {
      if (closingTimer.current) clearTimeout(closingTimer.current);
    };
  }, [isOpen]);

  // Close menu on scroll (ignore scroll inside the menu itself)
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, onClose, menuRef]);

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

      {visible && (
        <div className={`${styles.menuDropdown} ${closing ? styles['menuDropdown--closing'] : ''}`}>
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

          {/* Crossfade toggle — only on platforms with volume control (not iOS) */}
          {volumeControlSupported && (
            <>
              <div className={styles.menuSeparator} />

              <button
                className={`${styles.menuOptionToggle} ${crossfade.enabled ? styles['menuOptionToggle--active'] : ''}`}
                onClick={handleCrossfadeToggle}
              >
                <span>Fundido entre canciones</span>
                <span className={`${styles.toggleIndicator} ${crossfade.enabled ? styles['toggleIndicator--active'] : ''}`} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
