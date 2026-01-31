/**
 * DjInfoBadge Component
 *
 * Displays BPM, Key, and Energy info for the current track.
 * Only shown when DJ Flow is enabled.
 */

import { Music2, Gauge, Zap } from 'lucide-react';
import { useTrackAnalysis } from '../../hooks/useTrackAnalysis';
import { useDjFlowEnabled } from '../../store/djFlowStore';
import { formatBpm, formatKey, getCamelotColor } from '../../hooks/useDjFlow';
import styles from './DjInfoBadge.module.css';

interface DjInfoBadgeProps {
  trackId: string | null | undefined;
  variant?: 'compact' | 'full';
  className?: string;
}

export function DjInfoBadge({ trackId, variant = 'compact', className }: DjInfoBadgeProps) {
  const djFlowEnabled = useDjFlowEnabled();
  const { analysis, isAnalyzing } = useTrackAnalysis(trackId, {
    autoAnalyze: true,
    onlyWhenEnabled: true,
  });

  // Don't render if DJ Flow is disabled
  if (!djFlowEnabled) return null;

  // Show loading state
  if (isAnalyzing && !analysis) {
    return (
      <div className={`${styles.badge} ${styles[variant]} ${className || ''}`}>
        <span className={styles.analyzing}>Analizando...</span>
      </div>
    );
  }

  // Don't render if no analysis
  if (!analysis || analysis.status !== 'completed') return null;

  const keyColor = getCamelotColor(analysis.camelotKey);

  if (variant === 'compact') {
    return (
      <div className={`${styles.badge} ${styles.compact} ${className || ''}`}>
        <span className={styles.item}>
          <Music2 size={12} style={{ color: keyColor }} />
          {formatKey(analysis.camelotKey || analysis.key)}
        </span>
        <span className={styles.separator}>•</span>
        <span className={styles.item}>
          <Gauge size={12} />
          {formatBpm(analysis.bpm)}
        </span>
      </div>
    );
  }

  // Full variant with energy
  return (
    <div className={`${styles.badge} ${styles.full} ${className || ''}`}>
      <div className={styles.item}>
        <Music2 size={14} style={{ color: keyColor }} />
        <span className={styles.label}>Key</span>
        <span className={styles.value}>{formatKey(analysis.camelotKey || analysis.key)}</span>
      </div>
      <div className={styles.item}>
        <Gauge size={14} />
        <span className={styles.label}>BPM</span>
        <span className={styles.value}>{formatBpm(analysis.bpm)}</span>
      </div>
      {analysis.energy !== null && (
        <div className={styles.item}>
          <Zap size={14} />
          <span className={styles.label}>Energy</span>
          <span className={styles.value}>
            <span
              className={styles.energyBar}
              style={{ '--energy': analysis.energy } as React.CSSProperties}
            />
          </span>
        </div>
      )}
    </div>
  );
}

export default DjInfoBadge;
