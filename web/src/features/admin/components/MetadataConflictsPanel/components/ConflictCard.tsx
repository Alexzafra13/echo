import { useState } from 'react';
import { AlertCircle, Check, X, EyeOff } from 'lucide-react';
import { Button, InlineNotification } from '@shared/components/ui';
import {
  useAcceptConflict,
  useRejectConflict,
  useIgnoreConflict,
  useApplySuggestion,
  type MetadataConflict,
} from '../../../hooks/useMetadataConflicts';
import { SourceBadge } from './SourceBadge';
import { ComparisonView } from './ComparisonView';
import { SuggestionsSelector } from './SuggestionsSelector';
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
      <ComparisonView
        conflict={conflict}
        isImage={isImage}
        currentImageUrl={currentImageUrl}
        suggestedImageUrl={suggestedImageUrl}
      />

      {/* Multiple Suggestions Section (Picard-style) */}
      {hasMultipleSuggestions && (
        <SuggestionsSelector
          conflictId={conflict.id}
          suggestions={suggestions}
          selectedIndex={selectedSuggestionIndex}
          onSelectIndex={setSelectedSuggestionIndex}
          showAll={showAllSuggestions}
          onToggleShowAll={() => setShowAllSuggestions(!showAllSuggestions)}
        />
      )}

      {/* Error notification */}
      {error && (
        <InlineNotification
          type="error"
          message={error}
          onDismiss={() => setError(null)}
          autoHideMs={5000}
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
