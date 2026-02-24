import { useState, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Users } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { SearchInput, EmptyState, ErrorState } from '@shared/components/ui';
import { Sidebar } from '@features/home/components';
import { ArtistCard } from '../../components';
import { useArtists } from '../../hooks';
import { useArtistMetadataSync, useDocumentTitle } from '@shared/hooks';
import styles from './ArtistsPage.module.css';

/** A flat row: either a letter header or an artist card */
type VirtualRow =
  | { type: 'letter'; letter: string }
  | { type: 'artist'; artist: { id: string; name: string; orderArtistName?: string; albumCount: number; songCount: number; updatedAt?: string } };

/**
 * ArtistsPage Component
 * Displays all artists in alphabetical order with search functionality.
 * Uses virtualization to handle large libraries (500+ artists) efficiently.
 */
export default function ArtistsPage() {
  useDocumentTitle('Artistas');
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Real-time synchronization via WebSocket for artist images
  useArtistMetadataSync();

  // Fetch all artists (backend returns them sorted alphabetically by orderArtistName)
  const { data, isLoading, error } = useArtists({ skip: 0, take: 500 });

  // Build a flat list of rows: [letter, artist, artist, letter, artist, ...]
  // for efficient virtualization instead of nested DOM groups
  const { rows, totalArtists } = useMemo(() => {
    const artists = (data?.data || []).filter(artist =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = artists.reduce((acc, artist) => {
      const firstLetter = (artist.orderArtistName || artist.name)[0].toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(artist);
      return acc;
    }, {} as Record<string, typeof artists>);

    const flatRows: VirtualRow[] = [];
    for (const letter of Object.keys(grouped).sort()) {
      flatRows.push({ type: 'letter', letter });
      for (const artist of grouped[letter]) {
        flatRows.push({ type: 'artist', artist });
      }
    }

    return { rows: flatRows, totalArtists: artists.length };
  }, [data, searchQuery]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => (rows[index].type === 'letter' ? 56 : 64),
    overscan: 15,
  });

  const handleArtistClick = useCallback((artistId: string) => {
    setLocation(`/artists/${artistId}`);
  }, [setLocation]);

  return (
    <div className={styles.artistsPage}>
      <Sidebar />

      <main className={styles.artistsPage__main}>
        <Header
          customSearch={
            <div className={styles.artistsPage__searchForm}>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar artistas..."
              />
            </div>
          }
        />

        <div ref={scrollContainerRef} className={styles.artistsPage__content}>
          {/* Header Section */}
          <div className={styles.artistsPage__header}>
            <h1 className={styles.artistsPage__title}>Artistas</h1>
            <p className={styles.artistsPage__subtitle}>
              {data?.total || 0} artistas en tu biblioteca
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={styles.artistsPage__loading}>
              Cargando artistas...
            </div>
          )}

          {/* Error State */}
          {error && (
            <ErrorState message="Error al cargar artistas" />
          )}

          {/* Artists List - Virtualized */}
          {!isLoading && !error && (
            <div className={styles.artistsPage__list}>
              {totalArtists === 0 ? (
                <EmptyState
                  icon={<Users size={48} />}
                  title={searchQuery ? 'No se encontraron artistas' : 'No hay artistas en tu biblioteca'}
                  description={searchQuery ? 'Prueba con otro término de búsqueda' : undefined}
                />
              ) : (
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {row.type === 'letter' ? (
                          <h2 className={styles.artistsPage__groupLetter}>{row.letter}</h2>
                        ) : (
                          <ArtistCard
                            artist={row.artist}
                            onClick={() => handleArtistClick(row.artist.id)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
