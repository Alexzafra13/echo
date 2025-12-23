import { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { CollapsibleInfo } from '@shared/components/ui';
import {
  useMetadataConflicts,
  type MetadataConflict,
} from '../../hooks/useMetadataConflicts';
import { ArtistSidebarItem, ConflictCard } from './components';
import styles from './MetadataConflictsPanel.module.css';

/**
 * MetadataConflictsPanel Component
 * Only renders when there are pending suggestions
 */
export function MetadataConflictsPanel() {
  const filters = {
    skip: 0,
    take: 100,
  };

  const { data, isLoading, error } = useMetadataConflicts(filters);

  const conflicts = data?.conflicts || [];
  const total = data?.total || 0;

  // Don't render anything if loading or no suggestions
  if (isLoading || conflicts.length === 0) {
    return null;
  }

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

  const sortedArtists = Object.entries(groupedConflicts).sort(
    ([, a], [, b]) => b.length - a.length
  );

  const [selectedArtist, setSelectedArtist] = useState<string>(
    sortedArtists.length > 0 ? sortedArtists[0][0] : ''
  );

  if (selectedArtist && !groupedConflicts[selectedArtist] && sortedArtists.length > 0) {
    setSelectedArtist(sortedArtists[0][0]);
  }

  const selectedConflicts = selectedArtist ? groupedConflicts[selectedArtist] || [] : [];

  // Handle error state
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

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={22} className={styles.headerIcon} />
          <div>
            <h2 className={styles.title}>Sugerencias de Metadatos</h2>
            <p className={styles.description}>
              {total} sugerencias pendientes de revisar
            </p>
          </div>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeCount}>{total}</span>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.contentLayout}>
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
    </div>
  );
}
