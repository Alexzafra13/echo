import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Disc3 } from 'lucide-react';
import styles from './DjModeChip.module.css';

export interface DjModeChipProps {
  /** Modo DJ activo (orden por tonalidad, BPM y energía) */
  active: boolean;
  onToggle: (active: boolean) => void;
  /** Texto de ayuda alternativo (por defecto el global on/off) */
  title?: string;
  className?: string;
}

/**
 * Chip "DJ" que muestra y cambia el modo DJ de una acción de mezcla.
 * Se pinta encima de la tarjeta o junto al botón de shuffle; el clic no se
 * propaga para no disparar la reproducción.
 */
export function DjModeChip({ active, onToggle, title, className }: DjModeChipProps) {
  const { t } = useTranslation();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onToggle(!active);
  };

  const label = title ?? (active ? t('djMode.tooltipOn') : t('djMode.tooltipOff'));

  return (
    <button
      type="button"
      className={`${styles.djChip} ${active ? styles.djChipActive : ''} ${className || ''}`}
      onClick={handleClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Disc3 size={12} />
      <span>{t('djMode.badge')}</span>
    </button>
  );
}

export default DjModeChip;
