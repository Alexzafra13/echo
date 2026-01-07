import { useState } from 'react';
import { AlertCircle, Check, X, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, InlineNotification } from '@shared/components/ui';
import {
  useAcceptConflict,
  useRejectConflict,
  useIgnoreConflict,
  useApplySuggestion,
  type MetadataConflict,
} from '../../../hooks/useMetadataConflicts';
import { ImageWithFallback } from './ImageWithFallback';
import { SourceBadge } from './SourceBadge';
import { logger } from '@shared/utils/logger';
import styles from '../MetadataConflictsPanel.module.css';

interface ConflictCardProps {
  conflict: MetadataConflict;
}

const FIELD_LABELS: Record<string, string> = {
  externalCover: 'Cover Externa',
  cover: 'Cover',
  biography: 'Biografía',
  images: 'Imágenes',
  year: 'Año',
};

/**
 * Build complete image URLs
 */
function buildImageUrl(
  value: string | undefined,
  conflict: MetadataConflict
): string | undefined {
  if (!value) return undefined;

  // Already a complete URL (http/https)
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // API path (new format) - just use it directly, the proxy will handle it
  if (value.startsWith('/api/')) {
    return value;
  }

  // Old format: file path - construct API URL using entityId
  if (value.includes('uploads') || value.includes('\\')) {
    if (conflict.entityType === 'album') {
      return `/api/images/albums/${conflict.entityId}/cover`;
    } else if (conflict.entityType === 'artist') {
      return `/api/images/artists/${conflict.entityId}/profile`;
    }
  }

  // Default: treat as relative API path
  return `/api${value.startsWith('/') ? value : '/' + value}`;
}

/**
 * Single conflict card component - Compact visual design
 * Supports both simple conflicts and multi-suggestion conflicts (Picard-style)
 */
export function ConflictCard({ conflict }: ConflictCardProps) {
  const [isRemoved, setIsRemoved] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { mutate: accept, isPending: isAccepting } = useAcceptConflict();
  const { mutate: reject, isPending: isRejecting } = useRejectConflict();
  const { mutate: ignore, isPending: isIgnoring } = useIgnoreConflict();
  const { mutate: applySuggestion, isPending: isApplying } = useApplySuggestion();

  const isProcessing = isAccepting || isRejecting || isIgnoring || isApplying;

  // Check if this is a multi-suggestion conflict (Picard-style MBID auto-search)
  const hasMultipleSuggestions =
    conflict.metadata?.suggestions &&
    Array.isArray(conflict.metadata.suggestions) &&
    conflict.metadata.suggestions.length > 1;
  const suggestions = hasMultipleSuggestions ? conflict.metadata?.suggestions : [];

  const handleAccept = () => {
    setError(null);
    accept(conflict.id, {
      onSuccess: () => setIsRemoved(true),
      onError: (err) => setError('Error al aceptar: ' + (err as Error).message),
    });
  };

  const handleReject = () => {
    setError(null);
    reject(conflict.id, {
      onSuccess: () => setIsRemoved(true),
      onError: (err) => setError('Error al rechazar: ' + (err as Error).message),
    });
  };

  const handleIgnore = () => {
    setError(null);
    ignore(conflict.id, {
      onSuccess: () => setIsRemoved(true),
      onError: (err) => setError('Error al ignorar: ' + (err as Error).message),
    });
  };

  const handleApplySuggestion = () => {
    setError(null);
    applySuggestion(
      { conflictId: conflict.id, suggestionIndex: selectedSuggestionIndex },
      {
        onSuccess: () => setIsRemoved(true),
        onError: (err) =>
          setError('Error al aplicar sugerencia: ' + (err as Error).message),
      }
    );
  };

  // Hide card with fade-out animation when removed
  if (isRemoved) {
    return null;
  }

  const isImage = conflict.field.includes('cover') || conflict.field.includes('Cover');
  const currentImageUrl = isImage
    ? buildImageUrl(conflict.currentValue, conflict)
    : conflict.currentValue;
  const suggestedImageUrl = conflict.suggestedValue;

  return (
    <div className={styles.conflictCard}>
      {/* Card Header - Album/Entity Name */}
      <div className={styles.conflictCardHeader}>
        <div className={styles.conflictCardTitle}>
          <span className={styles.entityName}>
            {conflict.entity?.name || 'Desconocido'}
          </span>
          <span className={styles.fieldBadge}>
            {FIELD_LABELS[conflict.field] || conflict.field}
          </span>
        </div>
        <SourceBadge source={conflict.source} />
      </div>

      {/* Quality Notices */}
      {isImage &&
        (conflict.metadata?.qualityImprovement || conflict.metadata?.isLowQuality) && (
          <div className={styles.qualityNotices}>
            {conflict.metadata?.qualityImprovement && (
              <div className={styles.qualityBadge}>
                <Check size={14} />
                <span>Mejora de calidad</span>
              </div>
            )}
            {conflict.metadata?.isLowQuality && (
              <div className={styles.lowQualityBadge}>
                <AlertCircle size={14} />
                <span>Baja resolución</span>
              </div>
            )}
          </div>
        )}

      {/* Comparison View */}
      <div className={styles.comparisonView}>
        {/* Current Side */}
        <div className={styles.comparisonSide}>
          <div className={styles.comparisonLabel}>Actual</div>
          {isImage && currentImageUrl ? (
            <>
              <ImageWithFallback
                src={currentImageUrl}
                alt="Current"
                className={styles.imageCompact}
                fallbackMessage="Archivo no encontrado"
              />
              {conflict.metadata?.currentResolution ? (
                <div className={styles.resolutionText}>
                  {conflict.metadata.currentResolution}
                </div>
              ) : (
                <div
                  className={styles.sourceText}
                  style={{ fontStyle: 'italic', opacity: 0.7 }}
                >
                  Resolución no disponible
                </div>
              )}
              {conflict.metadata?.currentSource && (
                <div className={styles.sourceText}>{conflict.metadata.currentSource}</div>
              )}
            </>
          ) : isImage ? (
            <div className={styles.emptyImage}>
              <div>Sin carátula actual</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7 }}>
                (archivo eliminado o no encontrado)
              </div>
            </div>
          ) : (
            <div className={styles.textPreview}>
              {conflict.currentValue || <span className={styles.emptyText}>Sin datos</span>}
            </div>
          )}
        </div>

        {/* VS Divider */}
        <div className={styles.vsDivider}>
          <div className={styles.vsCircle}>VS</div>
        </div>

        {/* Suggested Side */}
        <div className={styles.comparisonSide}>
          <div className={styles.comparisonLabel}>Sugerida</div>
          {isImage ? (
            <>
              <div className={styles.imageCompact}>
                <img
                  src={suggestedImageUrl}
                  alt="Suggested"
                  onError={(e) => {
                    if (import.meta.env.DEV) {
                      logger.error(
                        'Error loading suggested cover:',
                        suggestedImageUrl,
                        'for conflict:',
                        conflict.id
                      );
                    }
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              {conflict.metadata?.suggestedResolution &&
              conflict.metadata.suggestedResolution !== 'Desconocida' ? (
                <div className={styles.resolutionText}>
                  {conflict.metadata.suggestedResolution}
                </div>
              ) : (
                <div
                  className={styles.sourceText}
                  style={{ fontStyle: 'italic', opacity: 0.7 }}
                >
                  Resolución no disponible
                </div>
              )}
            </>
          ) : (
            <div className={styles.textPreview}>{conflict.suggestedValue}</div>
          )}
        </div>
      </div>

      {/* Multiple Suggestions Section (Picard-style) */}
      {hasMultipleSuggestions && (
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
              onClick={() => setShowAllSuggestions(!showAllSuggestions)}
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
              {showAllSuggestions ? (
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
            {(showAllSuggestions ? suggestions : suggestions?.slice(0, 3))?.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (suggestion: any, index: number) => (
                <label
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor:
                      selectedSuggestionIndex === index
                        ? 'var(--accent-primary-alpha)'
                        : 'var(--bg-primary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border:
                      selectedSuggestionIndex === index
                        ? '2px solid var(--accent-primary)'
                        : '2px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="radio"
                    name={`suggestion-${conflict.id}`}
                    checked={selectedSuggestionIndex === index}
                    onChange={() => setSelectedSuggestionIndex(index)}
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
              )
            )}
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <InlineNotification
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Actions */}
      <div className={styles.conflictCardActions}>
        {hasMultipleSuggestions ? (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplySuggestion}
              loading={isApplying}
              disabled={isProcessing}
              leftIcon={<Check size={16} />}
            >
              Aplicar selección
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              loading={isRejecting}
              disabled={isProcessing}
              leftIcon={<X size={16} />}
            >
              Rechazar todas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIgnore}
              loading={isIgnoring}
              disabled={isProcessing}
              leftIcon={<EyeOff size={16} />}
            >
              Ignorar
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAccept}
              loading={isAccepting}
              disabled={isProcessing}
              leftIcon={<Check size={16} />}
            >
              Aceptar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              loading={isRejecting}
              disabled={isProcessing}
              leftIcon={<X size={16} />}
            >
              Rechazar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIgnore}
              loading={isIgnoring}
              disabled={isProcessing}
              leftIcon={<EyeOff size={16} />}
            >
              Ignorar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
