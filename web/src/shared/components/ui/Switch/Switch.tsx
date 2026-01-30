import styles from './Switch.module.css';

export interface SwitchProps {
  /** Whether the switch is checked */
  checked: boolean;
  /** Callback when switch state changes */
  onChange: (checked: boolean) => void;
  /** Whether the switch is disabled */
  disabled?: boolean;
  /** Accessible label for screen readers */
  'aria-label'?: string;
}

/**
 * Switch Component
 * Basic toggle switch control without label/description wrapper
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}: SwitchProps) {
  return (
    <label className={styles.switch}>
      <input
        type="checkbox"
        className={styles.switchInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <span className={styles.switchSlider}></span>
    </label>
  );
}
