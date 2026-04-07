import { Switch } from '../Switch';
import styles from './ToggleSwitch.module.css';

export interface ToggleSwitchProps {
  /** Label text displayed above the toggle */
  label: string;
  /** Optional description text below the label */
  description?: string;
  /** Whether the toggle is checked */
  checked: boolean;
  /** Callback when toggle state changes */
  onChange: (checked: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
}

/**
 * ToggleSwitch Component
 * Reusable toggle switch with label and optional description
 */
export function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <div className={styles.toggleItem}>
      <div className={styles.toggleInfo}>
        <span className={styles.toggleLabel}>{label}</span>
        {description && (
          <p className={styles.toggleDescription}>{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
