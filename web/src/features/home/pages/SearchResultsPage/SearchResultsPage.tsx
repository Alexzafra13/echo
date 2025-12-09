import { useSearch, useLocation } from 'wouter';
import { Disc, User as UserIcon, Music } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { useArtistMetadataSync, useAlbumMetadataSync } from '@shared/hooks';
import { Sidebar } from '../../components';
import { useAlbumSearch, useTrackSearch } from '@features/home/hooks';
import { useArtistSearch } from '@features/artists/hooks';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { getArtistImageUrl } from '@features/home/hooks';
import styles from './SearchResultsPage.module.css';

/**
 * SearchResultsPage Component
 * Full page displaying all search results organized by category
 * Follows the same layout pattern as HomePage and AlbumPage
 */
export function SearchResultsPage() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const query = searchParams.get('q') || '';

  // Fetch results from all three sources
  const { data: artistData, isLoading: loadingArtists } = useArtistSearch(query, { take: 20 });
  const { data: albums = [], isLoading: loadingAlbums } = useAlbumSearch(query);
  const { data: tracks = [], isLoading: loadingTracks } = useTrackSearch(query, { take: 50 });
  
  // Real-time synchronization via SSE for artist and album images
  useArtistMetadataSync();
  useAlbumMetadataSync();

  // Extract artists array from paginated response
  const artists = artistData?.data || [];

  const isLoading = loadingArtists || loadingAlbums || loadingTracks;
  const hasResults = artists.length > 0 || albums.length > 0 || tracks.length > 0;

  // Handle avatar image error - fallback to default avatar
  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const defaultAvatar = '/images/empy_cover/empy_cover_default.png';
    if (img.src !== defaultAvatar) {
      img.src = defaultAvatar;
    }
  };

  // Render content based on state
  const renderContent = () => {
    if (!query || query.length < 2) {
      return (
        <div className={styles.searchResultsPage__empty}>
          <Music size={64} />
          <h2>Buscar música</h2>
          <p>Escribe al menos 2 caracteres para buscar artistas, álbumes y canciones</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className={styles.searchResultsPage__loading}>
          <p>Buscando resultados para "{query}"...</p>
        </div>
      );
    }

    if (!hasResults) {
      return (
        <div className={styles.searchResultsPage__empty}>
          <Music size={64} />
          <h2>No se encontraron resultados</h2>
          <p>No hay resultados para "{query}". Intenta con otro término de búsqueda.</p>
        </div>
      );
    }

    return (
      <>
        <div className={styles.searchResultsPage__header}>
          <h1>Resultados de búsqueda</h1>
          <p className={styles.searchResultsPage__query}>"{query}"</p>
        </div>

        <div className={styles.searchResultsPage__sections}>
        {/* Artists Section */}
        {artists.length > 0 && (
          <section className={styles.searchResultsPage__section}>
            <h2 className={styles.searchResultsPage__sectionTitle}>
              <UserIcon size={24} />
              Artistas
              <span className={styles.searchResultsPage__count}>({artists.length})</span>
            </h2>
            <div className={styles.searchResultsPage__grid}>
              {artists.map((artist: any) => (
                <button
                  key={artist.id}
                  className={styles.searchResultsPage__card}
                  onClick={() => setLocation(`/artists/${artist.id}`)}
                >
                  <img
                    src={getArtistImageUrl(artist.id, 'profile', artist.updatedAt)}
                    alt={artist.name}
                    className={styles.searchResultsPage__cardImage_round}
                    onError={handleAvatarError}
                  />
                  <div className={styles.searchResultsPage__cardInfo}>
                    <p className={styles.searchResultsPage__cardTitle}>{artist.name}</p>
                    <p className={styles.searchResultsPage__cardMeta}>Artista</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Albums Section */}
        {albums.length > 0 && (
          <section className={styles.searchResultsPage__section}>
            <h2 className={styles.searchResultsPage__sectionTitle}>
              <Disc size={24} />
              Álbumes
              <span className={styles.searchResultsPage__count}>({albums.length})</span>
            </h2>
            <div className={styles.searchResultsPage__grid}>
              {albums.map((album: any) => (
                <button
                  key={album.id}
                  className={styles.searchResultsPage__card}
                  onClick={() => setLocation(`/album/${album.id}`)}
                >
                  <img
                    src={getCoverUrl(album.coverImage)}
                    alt={album.title}
                    className={styles.searchResultsPage__cardImage}
                    onError={handleImageError}
                  />
                  <div className={styles.searchResultsPage__cardInfo}>
                    <p className={styles.searchResultsPage__cardTitle}>{album.title}</p>
                    <p className={styles.searchResultsPage__cardMeta}>{album.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Tracks Section */}
        {tracks.length > 0 && (
          <section className={styles.searchResultsPage__section}>
            <h2 className={styles.searchResultsPage__sectionTitle}>
              <Music size={24} />
              Canciones
              <span className={styles.searchResultsPage__count}>({tracks.length})</span>
            </h2>
            <div className={styles.searchResultsPage__list}>
              {tracks.map((track: any, index: number) => (
                <button
                  key={track.id}
                  className={styles.searchResultsPage__listItem}
                  onClick={() => setLocation(`/album/${track.albumId}`)}
                >
                  <span className={styles.searchResultsPage__listNumber}>{index + 1}</span>
                  <img
                    src={getCoverUrl(track.albumId ? `/api/albums/${track.albumId}/cover` : undefined)}
                    alt={track.title}
                    className={styles.searchResultsPage__listImage}
                    onError={handleImageError}
                  />
                  <div className={styles.searchResultsPage__listInfo}>
                    <p className={styles.searchResultsPage__listTitle}>{track.title}</p>
                    <p className={styles.searchResultsPage__listMeta}>
                      {track.artistName || track.artist}
                      {(track.albumTitle || track.albumName) && (
                        <> • {track.albumTitle || track.albumName}</>
                      )}
                    </p>
                  </div>
                  {track.duration && (
                    <span className={styles.searchResultsPage__listDuration}>
                      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}
        </div>
      </>
    );
  };

  return (
    <div className={styles.searchResultsPage}>
      <Sidebar />

      <main className={styles.searchResultsPage__main}>
        <Header showBackButton />

        <div className={styles.searchResultsPage__content}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
