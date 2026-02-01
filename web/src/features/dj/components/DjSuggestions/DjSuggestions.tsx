/**
 * DjSuggestions Component
 *
 * Displays DJ track suggestions based on harmonic mixing compatibility.
 * Shows BPM, Key (Camelot), and compatibility score for each suggestion.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Disc3 } from 'lucide-react';
import { useDjSuggestions } from '../../hooks/useDjSuggestions';
import { useDjFlowEnabled } from '../../store/djFlowStore';
import { formatBpm, getCamelotColor } from '../../hooks/useDjFlow';
import type { DjSuggestion } from '../../types';
import styles from './DjSuggestions.module.css';

interface DjSuggestionsProps {
  trackId: string | null | undefined;
  onSelectTrack?: (trackId: string) => void;
  className?: string;
  compact?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'var(--color-success)';
  if (score >= 70) return 'var(--color-primary)';
  if (score >= 55) return 'var(--color-warning)';
  return 'var(--color-text-secondary)';
}

function getCompatibilityEmoji(compatibility: DjSuggestion['compatibility']): string {
  if (compatibility.keyCompatibility === 'perfect') return '🎯';
  if (compatibility.keyCompatibility === 'energy_boost') return '⚡';
  if (compatibility.canBeatmatch && compatibility.overall >= 80) return '🔥';
  if (compatibility.overall >= 70) return '✨';
  if (compatibility.overall >= 55) return '👍';
  return '🔄';
}

function getTransitionLabel(transition: DjSuggestion['compatibility']['suggestedTransition']): string {
  switch (transition) {
    case 'smooth': return 'Suave';
    case 'energy_up': return 'Sube energía';
    case 'energy_down': return 'Baja energía';
    case 'key_change': return 'Cambio tonal';
    default: return '';
  }
}

export function DjSuggestions({
  trackId,
  onSelectTrack,
  className,
  compact = false,
}: DjSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const djFlowEnabled = useDjFlowEnabled();
  const { suggestions, compatibleKeys, isLoading } = useDjSuggestions(trackId, {
    limit: compact ? 3 : 5,
    minScore: 50,
    prioritize: 'balanced',
  });

  // Don't render if DJ Flow is disabled
  if (!djFlowEnabled) return null;

  // Don't render if no track selected
  if (!trackId) return null;

  const handleSelectTrack = (suggestion: DjSuggestion) => {
    if (onSelectTrack) {
      onSelectTrack(suggestion.trackId);
    }
  };

  return (
    <div className={`${styles.container} ${className || ''} ${compact ? styles.compact : ''}`}>
      <button
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <Disc3 size={16} className={styles.icon} />
        <span className={styles.title}>Sugerencias DJ</span>
        {compatibleKeys.length > 0 && (
          <span className={styles.keysHint}>
            {compatibleKeys.slice(0, 3).map((key) => (
              <span
                key={key}
                className={styles.keyBadge}
                style={{ backgroundColor: getCamelotColor(key) }}
              >
                {key}
              </span>
            ))}
          </span>
        )}
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>Buscando tracks compatibles...</div>
          ) : suggestions.length === 0 ? (
            <div className={styles.empty}>
              No hay sugerencias. Analiza más tracks para mejores resultados.
            </div>
          ) : (
            <ul className={styles.list}>
              {suggestions.map((suggestion) => (
                <li key={suggestion.trackId}>
                  <button
                    className={styles.suggestion}
                    onClick={() => handleSelectTrack(suggestion)}
                    type="button"
                  >
                    <div className={styles.suggestionMain}>
                      <span className={styles.emoji}>
                        {getCompatibilityEmoji(suggestion.compatibility)}
                      </span>
                      <div className={styles.trackInfo}>
                        <span className={styles.trackTitle}>{suggestion.title}</span>
                        <span className={styles.trackArtist}>{suggestion.artist}</span>
                      </div>
                    </div>

                    <div className={styles.suggestionMeta}>
                      <div className={styles.djInfo}>
                        {suggestion.camelotKey && (
                          <span
                            className={styles.camelotKey}
                            style={{ color: getCamelotColor(suggestion.camelotKey) }}
                          >
                            {suggestion.camelotKey}
                          </span>
                        )}
                        {suggestion.bpm && (
                          <span className={styles.bpm}>
                            {formatBpm(suggestion.bpm)}
                          </span>
                        )}
                      </div>

                      <div className={styles.scores}>
                        <span
                          className={styles.score}
                          style={{ color: getScoreColor(suggestion.compatibility.overall) }}
                          title={`Score: ${suggestion.compatibility.overall}%`}
                        >
                          {suggestion.compatibility.overall}%
                        </span>
                        {suggestion.compatibility.suggestedTransition !== 'smooth' && (
                          <span className={styles.transition}>
                            {getTransitionLabel(suggestion.compatibility.suggestedTransition)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default DjSuggestions;
