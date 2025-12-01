import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumbs.module.css';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumbs Component
 * Muestra la ruta de navegación actual en el panel de administración
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {/* Home icon for first item */}
        <li className={styles.item}>
          {items[0].onClick ? (
            <button onClick={items[0].onClick} className={styles.link}>
              <Home size={16} />
              <span>{items[0].label}</span>
            </button>
          ) : (
            <span className={styles.current}>
              <Home size={16} />
              <span>{items[0].label}</span>
            </span>
          )}
        </li>

        {/* Rest of items */}
        {items.slice(1).map((item, index) => (
          <li key={index} className={styles.item}>
            <ChevronRight size={16} className={styles.separator} />
            {item.onClick ? (
              <button onClick={item.onClick} className={styles.link}>
                {item.label}
              </button>
            ) : (
              <span className={styles.current}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
