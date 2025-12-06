import styles from './Equalizer.module.css';

interface EqualizerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

/**
 * Animated equalizer bars component
 * Shows animated bars like a music visualizer to indicate active playback
 */
export function Equalizer({ size = 'md', color }: EqualizerProps) {
  return (
    <div className={`${styles.equalizer} ${styles[`equalizer--${size}`]}`}>
      <span
        className={styles.equalizer__bar}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span
        className={styles.equalizer__bar}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span
        className={styles.equalizer__bar}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span
        className={styles.equalizer__bar}
        style={color ? { backgroundColor: color } : undefined}
      />
    </div>
  );
}
