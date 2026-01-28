import { ChevronDown, ChevronUp } from 'lucide-react';

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
          {suggestions.length} sugerencias encontradas (selecciona una)
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
              Mostrar menos <ChevronUp size={14} />
            </>
          ) : (
            <>
              Mostrar todas <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayedSuggestions.map((suggestion, index) => (
          <label
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.75rem',
              backgroundColor:
                selectedIndex === index
                  ? 'var(--accent-primary-alpha)'
                  : 'var(--bg-primary)',
              borderRadius: '6px',
              cursor: 'pointer',
              border:
                selectedIndex === index
                  ? '2px solid var(--accent-primary)'
                  : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              type="radio"
              name={`suggestion-${conflictId}`}
              checked={selectedIndex === index}
              onChange={() => onSelectIndex(index)}
              style={{ marginTop: '2px' }}
            />
            <div style={{ flex: 1, fontSize: '0.875rem' }}>
              <div
                style={{
                  fontWeight: 500,
                  marginBottom: '0.25rem',
                  color: 'var(--text-primary)',
                }}
              >
                {suggestion.name}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor:
                      suggestion.score >= 90
                        ? 'var(--status-success-bg)'
                        : suggestion.score >= 75
                          ? 'var(--status-warning-bg)'
                          : 'var(--status-error-bg)',
                    color:
                      suggestion.score >= 90
                        ? 'var(--status-success)'
                        : suggestion.score >= 75
                          ? 'var(--status-warning)'
                          : 'var(--status-error)',
                    fontWeight: 600,
                  }}
                >
                  Score: {suggestion.score}
                </span>
                {suggestion.details?.disambiguation && (
                  <span>({suggestion.details.disambiguation})</span>
                )}
                {suggestion.details?.artistName && (
                  <span>Artista: {suggestion.details.artistName}</span>
                )}
                {suggestion.details?.country && (
                  <span>País: {suggestion.details.country}</span>
                )}
                {suggestion.details?.primaryType && (
                  <span>Tipo: {suggestion.details.primaryType}</span>
                )}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-quaternary)',
                  marginTop: '0.25rem',
                }}
              >
                MBID: {suggestion.mbid}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
