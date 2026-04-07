import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../MetadataConflictsPanel.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Suggestion {
  name: string;
  mbid: string;
  score: number;
  details?: {
    disambiguation?: string;
    artistName?: string;
    country?: string;
    primaryType?: string;
  };
}

interface SuggestionsSelectorProps {
  conflictId: string;
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
}

export function SuggestionsSelector({
  conflictId,
  suggestions,
  selectedIndex,
  onSelectIndex,
  showAll,
  onToggleShowAll,
}: SuggestionsSelectorProps) {
  const { t } = useTranslation();
  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, 3);

  return (
    <div
      style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {t('admin.metadata.suggestionsFound', { count: suggestions.length })}
        </div>
        <button
          onClick={onToggleShowAll}
          style={{
            fontSize: '0.75rem',
            color: 'var(--accent-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {showAll ? (
            <>
              {t('admin.metadata.showLess')} <ChevronUp size={14} />
            </>
          ) : (
            <>
              {t('admin.metadata.showAll')} <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>

      <div className={styles.suggestionsList}>
        {displayedSuggestions.map((suggestion, index) => (
          <label
            key={index}
            className={`${styles.suggestionLabel} ${selectedIndex === index ? styles.suggestionLabelSelected : ''}`}
          >
            <input
              type="radio"
              name={`suggestion-${conflictId}`}
              checked={selectedIndex === index}
              onChange={() => onSelectIndex(index)}
              className={styles.suggestionRadio}
            />
            <div className={styles.suggestionContent}>
              <div className={styles.suggestionName}>{suggestion.name}</div>
              <div className={styles.suggestionMeta}>
                <span
                  className={`${styles.suggestionScore} ${
                    suggestion.score >= 90
                      ? styles.suggestionScoreHigh
                      : suggestion.score >= 75
                        ? styles.suggestionScoreMedium
                        : styles.suggestionScoreLow
                  }`}
                >
                  Score: {suggestion.score}
                </span>
                {suggestion.details?.disambiguation && (
                  <span>({suggestion.details.disambiguation})</span>
                )}
                {suggestion.details?.artistName && (
                  <span>
                    {t('admin.metadata.artistLabel', { name: suggestion.details.artistName })}
                  </span>
                )}
                {suggestion.details?.country && (
                  <span>
                    {t('admin.metadata.countryLabel', { country: suggestion.details.country })}
                  </span>
                )}
                {suggestion.details?.primaryType && (
                  <span>
                    {t('admin.metadata.typeLabel', { type: suggestion.details.primaryType })}
                  </span>
                )}
              </div>
              <div className={styles.suggestionId}>MBID: {suggestion.mbid}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
