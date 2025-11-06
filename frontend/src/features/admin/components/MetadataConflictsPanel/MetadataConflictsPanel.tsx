import { useState } from 'react';
import { AlertCircle, Check, X, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useToast } from '@shared/context/ToastContext';
import {
  useMetadataConflicts,
  useAcceptConflict,
  useRejectConflict,
  useIgnoreConflict,
  type MetadataConflict,
} from '../../hooks/useMetadataConflicts';
import styles from './MetadataConflictsPanel.module.css';

/**
 * Priority badge component
 */
function PriorityBadge({ priority }: { priority: number }) {
  const labels = ['', 'Baja', 'Media', 'Alta'];
  const colors = ['', styles.priorityLow, styles.priorityMedium, styles.priorityHigh];

  return (
    <span className={`${styles.priorityBadge} ${colors[priority] || ''}`}>
      {labels[priority] || 'Desconocida'}
    </span>
  );
}

/**
 * Source badge component
 */
function SourceBadge({ source }: { source: string }) {
  const sourceLabels: Record<string, string> = {
    musicbrainz: 'MusicBrainz',
    coverartarchive: 'Cover Art Archive',
    lastfm: 'Last.fm',
    fanart: 'Fanart.tv',
  };

  return <span className={styles.sourceBadge}>{sourceLabels[source] || source}</span>;
}

/**
 * Artist conflict group component - Groups conflicts by artist with collapsible section
 */
function ArtistConflictGroup({
  artistName,
  conflicts,
}: {
  artistName: string;
  conflicts: MetadataConflict[];
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={styles.artistGroup}>
      <button
        className={styles.artistGroupHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.artistGroupInfo}>
          <span className={styles.artistGroupName}>{artistName}</span>
          <span className={styles.artistGroupCount}>
            {conflicts.length} {conflicts.length === 1 ? 'conflicto' : 'conflictos'}
          </span>
        </div>
        <div className={styles.artistGroupToggle}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      {isExpanded && (
        <div className={styles.artistGroupConflicts}>
          {conflicts.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Single conflict card component
 */
function ConflictCard({ conflict }: { conflict: MetadataConflict }) {
  const [expanded, setExpanded] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const { addToast } = useToast();
  const { mutate: accept, isPending: isAccepting } = useAcceptConflict();
  const { mutate: reject, isPending: isRejecting } = useRejectConflict();
  const { mutate: ignore, isPending: isIgnoring } = useIgnoreConflict();

  const isProcessing = isAccepting || isRejecting || isIgnoring;

  const handleAccept = () => {
    accept(conflict.id, {
      onSuccess: () => {
        setIsRemoved(true);
        addToast('Sugerencia aceptada y cambios aplicados', 'success');
      },
      onError: (error) => {
        addToast('Error al aceptar: ' + (error as Error).message, 'error');
      },
    });
  };

  const handleReject = () => {
    reject(conflict.id, {
      onSuccess: () => {
        setIsRemoved(true);
        addToast('Sugerencia rechazada, datos actuales conservados', 'info');
      },
      onError: (error) => {
        addToast('Error al rechazar: ' + (error as Error).message, 'error');
      },
    });
  };

  const handleIgnore = () => {
    ignore(conflict.id, {
      onSuccess: () => {
        setIsRemoved(true);
        addToast('Sugerencia ignorada permanentemente', 'info');
      },
      onError: (error) => {
        addToast('Error al ignorar: ' + (error as Error).message, 'error');
      },
    });
  };

  // Hide card with fade-out animation when removed
  if (isRemoved) {
    return null;
  }

  const fieldLabels: Record<string, string> = {
    externalCover: 'Cover Externa',
    cover: 'Cover',
    biography: 'Biografía',
    images: 'Imágenes',
    year: 'Año',
  };

  const isImage = conflict.field.includes('cover') || conflict.field.includes('Cover');

  // Build complete image URLs
  const buildImageUrl = (value: string | undefined): string | undefined => {
    if (!value) return undefined;

    // Already a complete URL (http/https)
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    // API path (new format)
    if (value.startsWith('/api/')) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      return `${baseUrl}${value.substring(4)}`; // Remove /api prefix and add baseUrl
    }

    // Old format: file path - construct API URL using entityId
    // Examples: "uploads\music\..." or "/uploads/music/..."
    if (value.includes('uploads') || value.includes('\\')) {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      if (conflict.entityType === 'album') {
        return `${baseUrl}/images/albums/${conflict.entityId}/cover`;
      } else if (conflict.entityType === 'artist') {
        // For artists, we'd need to know the image type
        return `${baseUrl}/images/artists/${conflict.entityId}/profile-medium`;
      }
    }

    // Default: treat as relative path
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    return `${baseUrl}${value.startsWith('/') ? value : '/' + value}`;
  };

  const currentImageUrl = isImage ? buildImageUrl(conflict.currentValue) : conflict.currentValue;
  const suggestedImageUrl = conflict.suggestedValue;

  return (
    <div className={styles.conflictCard}>
      <div className={styles.conflictHeader}>
        <div className={styles.conflictInfo}>
          <div className={styles.conflictTitle}>
            <AlertCircle size={20} className={styles.conflictIcon} />
            <span className={styles.entityName}>{conflict.entity?.name || 'Desconocido'}</span>
            <span className={styles.entityType}>({conflict.entityType})</span>
          </div>
          <div className={styles.conflictMeta}>
            <span className={styles.fieldName}>{fieldLabels[conflict.field] || conflict.field}</span>
            <SourceBadge source={conflict.source} />
            <PriorityBadge priority={conflict.priority} />
          </div>
        </div>

        <button
          className={styles.expandButton}
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Contraer' : 'Expandir'}
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className={styles.conflictBody}>
          <div className={styles.comparisonGrid}>
            {/* Current Value */}
            <div className={styles.comparisonColumn}>
              <h4 className={styles.comparisonLabel}>Actual</h4>
              {isImage && currentImageUrl ? (
                <div className={styles.imagePreview}>
                  <img
                    src={currentImageUrl}
                    alt="Current cover"
                    onError={(e) => {
                      console.error('Error loading current cover:', currentImageUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : isImage ? (
                <div className={styles.textValue}>
                  <em className={styles.emptyValue}>Sin cover</em>
                </div>
              ) : (
                <div className={styles.textValue}>
                  {conflict.currentValue || <em className={styles.emptyValue}>Sin datos</em>}
                </div>
              )}
              {conflict.metadata?.currentSource && (
                <div className={styles.valueSource}>Fuente: {conflict.metadata.currentSource}</div>
              )}
              {conflict.metadata?.currentResolution && (
                <div className={styles.valueSource}>Resolución: {conflict.metadata.currentResolution}</div>
              )}
            </div>

            {/* Suggested Value */}
            <div className={styles.comparisonColumn}>
              <h4 className={styles.comparisonLabel}>Sugerencia</h4>
              {isImage ? (
                <div className={styles.imagePreview}>
                  <img
                    src={suggestedImageUrl}
                    alt="Suggested cover"
                    onError={(e) => {
                      console.error('Error loading suggested cover:', suggestedImageUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className={styles.textValue}>{conflict.suggestedValue}</div>
              )}
              <div className={styles.valueSource}>
                Fuente: <SourceBadge source={conflict.source} />
              </div>
              {conflict.metadata?.suggestedResolution && (
                <div className={styles.valueSource}>Resolución: {conflict.metadata.suggestedResolution}</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.conflictActions}>
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
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MetadataConflictsPanel Component
 * Displays and manages pending metadata conflicts
 */
export function MetadataConflictsPanel() {
  const filters = {
    skip: 0,
    take: 100, // Increased to get all conflicts for grouping
  };

  const { data, isLoading, error } = useMetadataConflicts(filters);

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.loadingState}>
          <p>Cargando conflictos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.errorState}>
          <AlertCircle size={24} />
          <p>Error al cargar conflictos</p>
        </div>
      </div>
    );
  }

  const conflicts = data?.conflicts || [];
  const total = data?.total || 0;

  // Group conflicts by artist
  const groupedConflicts = conflicts.reduce((groups, conflict) => {
    const artistName = conflict.metadata?.artistName || 'Sin Artista';
    if (!groups[artistName]) {
      groups[artistName] = [];
    }
    groups[artistName].push(conflict);
    return groups;
  }, {} as Record<string, MetadataConflict[]>);

  // Sort artists by number of conflicts (descending)
  const sortedArtists = Object.entries(groupedConflicts).sort(
    ([, a], [, b]) => b.length - a.length
  );

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Sugerencias de Metadatos</h2>
          <p className={styles.description}>
            Revisa y aprueba sugerencias de fuentes externas para mejorar tus metadatos
          </p>
        </div>
        {total > 0 && (
          <div className={styles.badge}>
            <span className={styles.badgeCount}>{total}</span>
            <span className={styles.badgeLabel}>Pendientes</span>
          </div>
        )}
      </div>

      {/* Conflicts List */}
      {conflicts.length === 0 ? (
        <div className={styles.emptyState}>
          <Check size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>¡Todo al día!</h3>
          <p className={styles.emptyMessage}>
            No hay sugerencias de metadatos pendientes de revisar
          </p>
        </div>
      ) : (
        <div className={styles.artistGroups}>
          {sortedArtists.map(([artistName, artistConflicts]) => (
            <ArtistConflictGroup
              key={artistName}
              artistName={artistName}
              conflicts={artistConflicts}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className={styles.infoBox}>
        <AlertCircle size={20} className={styles.infoIcon} />
        <div className={styles.infoContent}>
          <p className={styles.infoTitle}>Sobre las sugerencias:</p>
          <ul className={styles.infoList}>
            <li>
              <strong>Alta prioridad (MusicBrainz):</strong> Se aplican automáticamente por su alta
              confiabilidad
            </li>
            <li>
              <strong>Media prioridad (Last.fm, Fanart):</strong> Requieren tu aprobación antes de
              aplicarse
            </li>
            <li>
              <strong>Aceptar:</strong> Aplica la sugerencia y reemplaza el dato actual
            </li>
            <li>
              <strong>Rechazar:</strong> Mantiene el dato actual y marca la sugerencia como
              rechazada
            </li>
            <li>
              <strong>Ignorar:</strong> Oculta permanentemente esta sugerencia
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
