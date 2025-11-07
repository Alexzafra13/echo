import { useState } from 'react';
import { AlertCircle, Check, X, EyeOff } from 'lucide-react';
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
 * Sidebar artist item component
 */
function ArtistSidebarItem({
  artistName,
  conflictCount,
  isSelected,
  onClick,
}: {
  artistName: string;
  conflictCount: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`${styles.sidebarItem} ${isSelected ? styles.sidebarItemSelected : ''}`}
      onClick={onClick}
    >
      <div className={styles.sidebarItemContent}>
        <span className={styles.sidebarItemName}>{artistName}</span>
        <span className={styles.sidebarItemCount}>{conflictCount}</span>
      </div>
    </button>
  );
}

/**
 * Single conflict card component - Compact visual design
 */
function ConflictCard({ conflict }: { conflict: MetadataConflict }) {
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

  // Debug logging for metadata and missing covers
  if (isImage) {
    if (!conflict.metadata?.suggestedResolution) {
      console.warn('⚠️ Conflict missing suggested resolution data:', {
        id: conflict.id,
        entity: conflict.entity?.name,
        source: conflict.source,
        hasMetadata: !!conflict.metadata,
        metadata: conflict.metadata,
      });
    }

    if (!conflict.currentValue) {
      console.info('ℹ️ Conflict has no current cover (file may have been deleted):', {
        id: conflict.id,
        entity: conflict.entity?.name,
        source: conflict.source,
      });
    }
  }

  // Build complete image URLs
  const buildImageUrl = (value: string | undefined): string | undefined => {
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
    // Examples: "uploads\music\..." or "/uploads/music/..."
    if (value.includes('uploads') || value.includes('\\')) {
      if (conflict.entityType === 'album') {
        return `/api/images/albums/${conflict.entityId}/cover`;
      } else if (conflict.entityType === 'artist') {
        return `/api/images/artists/${conflict.entityId}/profile-medium`;
      }
    }

    // Default: treat as relative API path
    return `/api${value.startsWith('/') ? value : '/' + value}`;
  };

  const currentImageUrl = isImage ? buildImageUrl(conflict.currentValue) : conflict.currentValue;
  const suggestedImageUrl = conflict.suggestedValue;

  return (
    <div className={styles.conflictCard}>
      {/* Card Header - Album/Entity Name */}
      <div className={styles.conflictCardHeader}>
        <div className={styles.conflictCardTitle}>
          <span className={styles.entityName}>{conflict.entity?.name || 'Desconocido'}</span>
          <span className={styles.fieldBadge}>{fieldLabels[conflict.field] || conflict.field}</span>
        </div>
        <SourceBadge source={conflict.source} />
      </div>

      {/* Quality Notices */}
      {isImage && (conflict.metadata?.qualityImprovement || conflict.metadata?.isLowQuality) && (
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
              <div className={styles.imageCompact}>
                <img
                  src={currentImageUrl}
                  alt="Current"
                  onError={(e) => {
                    console.warn('⚠️ Current cover failed to load (404 or network error):', currentImageUrl, 'for conflict:', conflict.id);
                    // Hide the broken image
                    e.currentTarget.style.display = 'none';
                    // Show message in container
                    const container = e.currentTarget.parentElement;
                    if (container) {
                      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);font-size:0.875rem;font-style:italic;text-align:center;padding:1rem;">Archivo no encontrado</div>';
                    }
                  }}
                  onLoad={() => {
                    console.log('✓ Current cover loaded:', currentImageUrl);
                  }}
                />
              </div>
              {conflict.metadata?.currentResolution ? (
                <div className={styles.resolutionText}>{conflict.metadata.currentResolution}</div>
              ) : (
                <div className={styles.sourceText} style={{ fontStyle: 'italic', opacity: 0.7 }}>
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
                    console.error('Error loading suggested cover:', suggestedImageUrl, 'for conflict:', conflict.id);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('✓ Suggested cover loaded:', suggestedImageUrl);
                  }}
                />
              </div>
              {conflict.metadata?.suggestedResolution && conflict.metadata.suggestedResolution !== 'Desconocida' ? (
                <div className={styles.resolutionText}>{conflict.metadata.suggestedResolution}</div>
              ) : (
                <div className={styles.sourceText} style={{ fontStyle: 'italic', opacity: 0.7 }}>
                  Resolución no disponible
                </div>
              )}
            </>
          ) : (
            <div className={styles.textPreview}>{conflict.suggestedValue}</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.conflictCardActions}>
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
  );
}

/**
 * MetadataConflictsPanel Component
 * Displays and manages pending metadata conflicts with sidebar navigation
 */
export function MetadataConflictsPanel() {
  const filters = {
    skip: 0,
    take: 100, // Increased to get all conflicts for grouping
  };

  const { data, isLoading, error } = useMetadataConflicts(filters);

  // Group conflicts by artist
  const conflicts = data?.conflicts || [];
  const total = data?.total || 0;

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

  // Select first artist by default
  const [selectedArtist, setSelectedArtist] = useState<string>(
    sortedArtists.length > 0 ? sortedArtists[0][0] : ''
  );

  // Update selected artist if it becomes empty after actions
  if (selectedArtist && !groupedConflicts[selectedArtist] && sortedArtists.length > 0) {
    setSelectedArtist(sortedArtists[0][0]);
  }

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

  const selectedConflicts = selectedArtist ? groupedConflicts[selectedArtist] || [] : [];

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

      {/* Main Content Area */}
      {conflicts.length === 0 ? (
        <div className={styles.emptyState}>
          <Check size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>¡Todo al día!</h3>
          <p className={styles.emptyMessage}>
            No hay sugerencias de metadatos pendientes de revisar
          </p>
        </div>
      ) : (
        <div className={styles.contentLayout}>
          {/* Sidebar - Artist List */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>Artistas</h3>
              <span className={styles.sidebarCount}>{sortedArtists.length}</span>
            </div>
            <div className={styles.sidebarList}>
              {sortedArtists.map(([artistName, artistConflicts]) => (
                <ArtistSidebarItem
                  key={artistName}
                  artistName={artistName}
                  conflictCount={artistConflicts.length}
                  isSelected={selectedArtist === artistName}
                  onClick={() => setSelectedArtist(artistName)}
                />
              ))}
            </div>
          </aside>

          {/* Main Content - Conflict Details */}
          <main className={styles.mainContent}>
            {selectedArtist && (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <h3 className={styles.detailTitle}>{selectedArtist}</h3>
                    <p className={styles.detailSubtitle}>
                      {selectedConflicts.length}{' '}
                      {selectedConflicts.length === 1 ? 'conflicto pendiente' : 'conflictos pendientes'}
                    </p>
                  </div>
                </div>
                <div className={styles.conflictsList}>
                  {selectedConflicts.map((conflict) => (
                    <ConflictCard key={conflict.id} conflict={conflict} />
                  ))}
                </div>
              </>
            )}
          </main>
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
