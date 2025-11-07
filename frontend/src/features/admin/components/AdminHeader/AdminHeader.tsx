import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import styles from './AdminHeader.module.css';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * AdminHeader Component
 * Cabecera común para todas las páginas de administración
 * Incluye botón de navegación "Volver" consistente
 */
export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBackNavigation = () => {
    // Go back to previous page in history, or home if no history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  return (
    <div className={styles.header}>
      <button className={styles.backButton} onClick={handleBackNavigation}>
        <ArrowLeft size={20} />
        <span>Volver</span>
      </button>

      {(title || subtitle) && (
        <div className={styles.headerContent}>
          {title && <h1 className={styles.title}>{title}</h1>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
