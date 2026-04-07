import styles from './Equalizer.module.css';

interface EqualizerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

/**
 * Componente de barras de ecualizador animadas.
 * Muestra barras animadas estilo visualizador para indicar reproducción activa.
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
