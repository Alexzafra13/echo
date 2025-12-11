import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { CollapsibleInfo } from '@shared/components/ui';
import {
  useMetadataConflicts,
  type MetadataConflict,
} from '../../hooks/useMetadataConflicts';
import { ArtistSidebarItem, ConflictCard } from './components';
import styles from './MetadataConflictsPanel.module.css';

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

  const groupedConflicts = conflicts.reduce(
    (groups, conflict) => {
      const artistName = conflict.metadata?.artistName || 'Sin Artista';
      if (!groups[artistName]) {
        groups[artistName] = [];
      }
      groups[artistName].push(conflict);
      return groups;
    },
    {} as Record<string, MetadataConflict[]>
  );

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

  // Hide panel completely when there are no suggestions
  if (conflicts.length === 0) {
    return null;
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
                      {selectedConflicts.length === 1
                        ? 'conflicto pendiente'
                        : 'conflictos pendientes'}
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

      {/* Info Box */}
      <CollapsibleInfo title="Sobre las sugerencias" defaultExpanded={false}>
        <ul>
          <li>
            <strong>Alta prioridad (MusicBrainz):</strong> Se aplican automáticamente por
            su alta confiabilidad
          </li>
          <li>
            <strong>Media prioridad (Last.fm, Fanart):</strong> Requieren tu aprobación
            antes de aplicarse
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
      </CollapsibleInfo>
    </div>
  );
}
