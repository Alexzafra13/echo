import { forwardRef } from 'react';
import { X } from 'lucide-react';
import { QueueList } from '../../QueueList/QueueList';
import styles from '../NowPlayingView.module.css';

interface QueuePanelProps {
  isDesktop: boolean;
  queueState: 'half' | 'full';
  isClosing: boolean;
  dragOffset: number;
  isDragging: boolean;
  onClose: () => void;
  contentRef: React.RefObject<HTMLDivElement>;
}

/**
 * QueuePanel - Bottom sheet (mobile) or side panel (desktop) for queue
 */
export const QueuePanel = forwardRef<HTMLDivElement, QueuePanelProps>(
  function QueuePanel(
    { isDesktop, queueState, isClosing, dragOffset, isDragging, onClose, contentRef },
    ref
  ) {
    const mobileStyles = !isDesktop
      ? {
          height: queueState === 'full' ? '90vh' : '50vh',
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging
            ? 'none'
            : 'height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-radius 0.3s ease',
        }
      : undefined;

    return (
      <div
        className={`${styles.nowPlaying__queuePanel} ${queueState === 'full' ? styles['nowPlaying__queuePanel--full'] : ''} ${isClosing ? styles['nowPlaying__queuePanel--closing'] : ''}`}
        ref={ref}
        style={mobileStyles}
      >
        {/* Mobile: drag handle */}
        <div className={styles.nowPlaying__queueHandle} />

        {/* Desktop: header with close button */}
        {isDesktop && (
          <div className={styles.nowPlaying__queueHeader}>
            <h3 className={styles.nowPlaying__queueTitle}>Cola de reproducción</h3>
            <button
              className={styles.nowPlaying__queueClose}
              onClick={onClose}
              title="Cerrar cola"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className={styles.nowPlaying__queueContent} ref={contentRef}>
          <QueueList onClose={onClose} />
        </div>
      </div>
    );
  }
);
