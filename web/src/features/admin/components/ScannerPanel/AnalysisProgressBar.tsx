import { Volume2, Music2 } from 'lucide-react';
import styles from './ScannerPanel.module.css';

interface AnalysisProgressBarProps {
  type: 'lufs' | 'dj';
  progress: {
    isRunning: boolean;
    pendingTracks: number;
    processedInSession: number;
    estimatedTimeRemaining?: string | null;
  };
}

export function AnalysisProgressBar({ type, progress }: AnalysisProgressBarProps) {
  const total = progress.processedInSession + progress.pendingTracks;
  const percent = total > 0 ? Math.round((progress.processedInSession / total) * 100) : 0;
  const label = type === 'lufs' ? 'LUFS' : 'DJ';

  const isLufs = type === 'lufs';
  const Icon = isLufs ? Volume2 : Music2;
  const barClass = isLufs ? styles.lufsBar : styles.djBar;
  const iconClass = progress.isRunning
    ? isLufs
      ? styles.lufsIconRunning
      : styles.djIconRunning
    : isLufs
      ? styles.lufsIcon
      : styles.djIcon;
  const textClass = isLufs ? styles.lufsText : styles.djText;
  const percentClass = isLufs ? styles.lufsPercent : styles.djPercent;
  const etaClass = isLufs ? styles.lufsEta : styles.djEta;
  const progressInlineClass = isLufs ? styles.lufsProgressInline : styles.djProgressInline;
  const progressFillClass = isLufs ? styles.lufsProgressFill : styles.djProgressFill;

  return (
    <div className={barClass}>
      <Icon size={14} className={iconClass} />
      <span className={textClass}>
        {label}: {progress.processedInSession}/{total}
        {total > 0 && <span className={percentClass}>({percent}%)</span>}
      </span>
      {progress.estimatedTimeRemaining && (
        <span className={etaClass}>~{progress.estimatedTimeRemaining}</span>
      )}
      {progress.isRunning && (
        <div className={progressInlineClass}>
          <div className={progressFillClass} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
