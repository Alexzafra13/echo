import { useState } from 'react';
import { AlertCircle, Check, X, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@shared/components/ui';
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
 * Single conflict card component
 */
function ConflictCard({ conflict }: { conflict: MetadataConflict }) {
  const [expanded, setExpanded] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const { mutate: accept, isPending: isAccepting } = useAcceptConflict();
  const { mutate: reject, isPending: isRejecting } = useRejectConflict();
  const { mutate: ignore, isPending: isIgnoring } = useIgnoreConflict();

  const isProcessing = isAccepting || isRejecting || isIgnoring;

  const handleAccept = () => {
    if (window.confirm('¿Aceptar esta sugerencia y aplicar los cambios?')) {
      accept(conflict.id, {
        onSuccess: () => {
          setIsRemoved(true);
        },
        onError: (error) => {
          alert('Error al aceptar la sugerencia: ' + (error as Error).message);
        },
      });
    }
  };

  const handleReject = () => {
    if (window.confirm('¿Rechazar esta sugerencia y mantener los datos actuales?')) {
      reject(conflict.id, {
        onSuccess: () => {
          setIsRemoved(true);
        },
        onError: (error) => {
          alert('Error al rechazar la sugerencia: ' + (error as Error).message);
        },
      });
    }
  };

  const handleIgnore = () => {
    if (window.confirm('¿Ignorar permanentemente esta sugerencia?')) {
      ignore(conflict.id, {
        onSuccess: () => {
          setIsRemoved(true);
        },
        onError: (error) => {
          alert('Error al ignorar la sugerencia: ' + (error as Error).message);
        },
      });
    }
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
              {isImage && conflict.currentValue ? (
                <div className={styles.imagePreview}>
                  <img src={conflict.currentValue} alt="Current cover" />
                </div>
              ) : (
                <div className={styles.textValue}>
                  {conflict.currentValue || <em className={styles.emptyValue}>Sin datos</em>}
                </div>
              )}
              {conflict.metadata?.currentSource && (
                <div className={styles.valueSource}>Fuente: {conflict.metadata.currentSource}</div>
              )}
            </div>

            {/* Suggested Value */}
            <div className={styles.comparisonColumn}>
              <h4 className={styles.comparisonLabel}>Sugerencia</h4>
              {isImage ? (
                <div className={styles.imagePreview}>
                  <img src={conflict.suggestedValue} alt="Suggested cover" />
                </div>
              ) : (
                <div className={styles.textValue}>{conflict.suggestedValue}</div>
              )}
              <div className={styles.valueSource}>
                Fuente: <SourceBadge source={conflict.source} />
              </div>
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
    take: 20,
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
        <div className={styles.conflictsList}>
          {conflicts.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} />
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
