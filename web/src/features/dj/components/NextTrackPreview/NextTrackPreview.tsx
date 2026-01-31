/**
 * NextTrackPreview Component
 *
 * Shows a preview of the next track with compatibility information.
 * Displays harmonic compatibility, BPM difference, and transition type.
 */

import { ChevronRight } from 'lucide-react';
import { useDjFlowEnabled } from '../../store/djFlowStore';
import { useTrackAnalysis } from '../../hooks/useTrackAnalysis';
import { getCompatibilityIndicator } from '../../hooks/useCompatibleTracks';
import { formatBpm, formatKey, getCamelotColor } from '../../hooks/useDjFlow';
import type { Track } from '@shared/types/track.types';
import type { TrackCompatibility } from '../../types';
import styles from './NextTrackPreview.module.css';

interface NextTrackPreviewProps {
  nextTrack: Track | null;
  compatibility: TrackCompatibility | null;
  className?: string;
}

export function NextTrackPreview({
  nextTrack,
  compatibility,
  className,
}: NextTrackPreviewProps) {
  const djFlowEnabled = useDjFlowEnabled();
  const { analysis } = useTrackAnalysis(nextTrack?.id, {
    autoAnalyze: true,
    onlyWhenEnabled: true,
  });

  // Don't render if DJ Flow is disabled or no next track
  if (!djFlowEnabled || !nextTrack) return null;

  const indicator = compatibility
    ? getCompatibilityIndicator(compatibility.overallScore)
    : null;

  const keyColor = analysis?.camelotKey
    ? getCamelotColor(analysis.camelotKey)
    : undefined;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.header}>
        <ChevronRight size={14} />
        <span className={styles.label}>Siguiente</span>
        {indicator && (
          <span
            className={styles.indicator}
            style={{ color: indicator.color }}
            title={indicator.label}
          >
            {indicator.emoji}
          </span>
        )}
      </div>

      <div className={styles.track}>
        <span className={styles.title}>{nextTrack.title}</span>
        {analysis && analysis.status === 'completed' && (
          <span className={styles.info}>
            <span style={{ color: keyColor }}>
              {formatKey(analysis.camelotKey || analysis.key)}
            </span>
            <span className={styles.dot}>•</span>
            <span>{formatBpm(analysis.bpm)}</span>
            {compatibility && Math.abs(compatibility.bpmDifference) > 0 && (
              <span className={styles.bpmDiff}>
                {compatibility.bpmDifference > 0 ? '+' : ''}
                {compatibility.bpmDifference.toFixed(1)}%
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export default NextTrackPreview;
