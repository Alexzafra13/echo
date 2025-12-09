import { useState } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { ArtistCard } from '../../components';
import { useArtists } from '../../hooks';
import { useArtistMetadataSync } from '@shared/hooks';
import { Search, X } from 'lucide-react';
import styles from './ArtistsPage.module.css';

/**
 * ArtistsPage Component
 * Displays all artists in alphabetical order with search functionality
 */
export default function ArtistsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time synchronization via SSE for artist images
  useArtistMetadataSync();

  // Fetch all artists (backend returns them sorted alphabetically by orderArtistName)
  const { data, isLoading, error } = useArtists({ skip: 0, take: 500 });

  // Filter artists by search query (client-side for now)
  const filteredArtists = (data?.data || []).filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group artists alphabetically
  const groupedArtists = filteredArtists.reduce((acc, artist) => {
    const firstLetter = (artist.orderArtistName || artist.name)[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(artist);
    return acc;
  }, {} as Record<string, typeof filteredArtists>);

  const alphabetGroups = Object.keys(groupedArtists).sort();

  const handleArtistClick = (artistId: string) => {
    setLocation(`/artists/${artistId}`);
  };

  return (
    <div className={styles.artistsPage}>
      <Sidebar />

      <main className={styles.artistsPage__main}>
        <Header
          customSearch={
            <div className={styles.artistsPage__searchForm}>
              <div className={styles.artistsPage__searchWrapper}>
                <Search size={20} className={styles.artistsPage__searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar artistas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.artistsPage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={styles.artistsPage__searchClearButton}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <div className={styles.artistsPage__content}>
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
            <div className={styles.artistsPage__error}>
              Error al cargar artistas
            </div>
          )}

          {/* Artists List */}
          {!isLoading && !error && (
            <div className={styles.artistsPage__list}>
              {alphabetGroups.length === 0 ? (
                <div className={styles.artistsPage__empty}>
                  {searchQuery ? 'No se encontraron artistas' : 'No hay artistas en tu biblioteca'}
                </div>
              ) : (
                alphabetGroups.map(letter => (
                  <div key={letter} className={styles.artistsPage__group}>
                    <h2 className={styles.artistsPage__groupLetter}>{letter}</h2>
                    <div className={styles.artistsPage__groupList}>
                      {groupedArtists[letter].map(artist => (
                        <ArtistCard
                          key={artist.id}
                          artist={artist}
                          onClick={() => handleArtistClick(artist.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
