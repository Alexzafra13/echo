import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import styles from './BackButton.module.css';

/**
 * BackButton Component
 * Animated back button that navigates to previous page in browser history
 *
 * @example
 * <BackButton />
 * <BackButton text="Volver al inicio" />
 * <BackButton onBack={() => console.log('Going back')} />
 */

interface BackButtonProps {
  /** Custom text to display (default: "Volver") */
  text?: string;
  /** Optional callback to execute before going back */
  onBack?: () => void;
  /** Additional CSS class */
  className?: string;
}

export function BackButton({ text, onBack, className }: BackButtonProps) {
  const { t } = useTranslation();
  const displayText = text ?? t('ui.back');
  const handleClick = () => {
    onBack?.();
    window.history.back();
  };

  return (
    <button
      className={`${styles.backButton} ${className || ''}`}
      onClick={handleClick}
      type="button"
      aria-label={t('ui.backAriaLabel')}
    >
      <div className={styles.backButton__iconContainer}>
        <ChevronLeft size={20} className={styles.backButton__icon} />
      </div>
      <span className={styles.backButton__text}>{displayText}</span>
    </button>
  );
}
