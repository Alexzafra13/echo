import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import styles from './CollapsibleInfo.module.css';

interface CollapsibleInfoProps {
  /** Title of the info box */
  title: string;
  /** Children content to show when expanded */
  children: React.ReactNode;
  /** Whether the box is expanded by default */
  defaultExpanded?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * CollapsibleInfo Component
 * Collapsible information box with blue accent
 * Used throughout admin panels for informational messages
 */
export function CollapsibleInfo({ title, children, defaultExpanded = false, className }: CollapsibleInfoProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentId = useId();

  return (
    <div className={`${styles.infoBox} ${className || ''}`}>
      <button
        className={styles.infoBox__header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        type="button"
      >
        <div className={styles.infoBox__headerLeft}>
          <Info size={20} className={styles.infoBox__icon} aria-hidden="true" />
          <h3 className={styles.infoBox__title}>{title}</h3>
        </div>
        <div className={styles.infoBox__toggle} aria-hidden="true">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && (
        <div id={contentId} className={styles.infoBox__content} role="region" aria-label={title}>
          {children}
        </div>
      )}
    </div>
  );
}
