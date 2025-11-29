import { useLocation } from 'wouter';
import { Shuffle, Clock, Sparkles, Disc, RefreshCw } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { AlbumCard } from '@features/home/components/AlbumCard';
import { useQueryClient } from '@tanstack/react-query';
import { useGridDimensions } from '@features/home/hooks';
import { getCoverUrl } from '@shared/utils/cover.utils';
import {
  useUnplayedAlbums,
  useForgottenAlbums,
  useHiddenGems,
  useRandomAlbums,
} from '../../hooks/useExplore';
import styles from './ExplorePage.module.css';

/**
 * ExplorePage Component
 * Discovery section with unplayed albums, forgotten albums, hidden gems, and random picks
 */
export default function ExplorePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Calculate items for single row based on screen size
  const { itemsPerPage: itemsPerRow } = useGridDimensions({ maxRows: 1 });

  // Fetch data - limit to one row of items
  const { data: unplayedData, isLoading: loadingUnplayed } = useUnplayedAlbums(itemsPerRow);
  const { data: forgottenData, isLoading: loadingForgotten } = useForgottenAlbums(itemsPerRow);
  const { data: hiddenGemsData, isLoading: loadingGems } = useHiddenGems(10);
  const { data: randomData, isLoading: loadingRandom } = useRandomAlbums(itemsPerRow);

  const handleRefreshRandom = () => {
    queryClient.invalidateQueries({ queryKey: ['explore', 'random-albums'] });
  };

  const navigateToAlbum = (albumId: string) => {
    setLocation(`/album/${albumId}`);
  };

  return (
    <div className={styles.explorePage}>
      <Sidebar />

      <main className={styles.explorePage__main}>
        <Header />

        <div className={styles.explorePage__content}>
          {/* Page Header */}
          <div className={styles.explorePage__header}>
            <h1 className={styles.explorePage__title}>Explorar</h1>
            <p className={styles.explorePage__subtitle}>
              Descubre música en tu biblioteca
            </p>
          </div>

          {/* Surprise Me Section */}
          <section className={styles.explorePage__section}>
            <div className={styles.explorePage__sectionHeader}>
              <Shuffle size={24} className={styles.explorePage__sectionIcon} />
              <h2 className={styles.explorePage__sectionTitle}>Sorpréndeme</h2>
              <button
                className={styles.explorePage__refreshButton}
                onClick={handleRefreshRandom}
                title="Obtener otros aleatorios"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            {loadingRandom ? (
              <div className={styles.explorePage__loading}>Cargando...</div>
            ) : randomData?.albums && randomData.albums.length > 0 ? (
              <div className={styles.explorePage__albumGrid}>
                {randomData.albums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    cover={getCoverUrl(album.coverArtPath)}
                    title={album.name}
                    artist={album.artistName || 'Artista desconocido'}
                    onClick={() => navigateToAlbum(album.id)}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.explorePage__empty}>No hay albums disponibles</p>
            )}
          </section>

          {/* Unplayed Albums Section */}
          <section className={styles.explorePage__section}>
            <div className={styles.explorePage__sectionHeader}>
              <Disc size={24} className={styles.explorePage__sectionIcon} />
              <h2 className={styles.explorePage__sectionTitle}>Sin escuchar</h2>
              {unplayedData?.total && unplayedData.total > itemsPerRow && (
                <button
                  className={styles.explorePage__viewAllButton}
                  onClick={() => setLocation('/explore/unplayed')}
                >
                  Ver todos ({unplayedData.total}) →
                </button>
              )}
            </div>
            {loadingUnplayed ? (
              <div className={styles.explorePage__loading}>Cargando...</div>
            ) : unplayedData?.albums && unplayedData.albums.length > 0 ? (
              <div className={styles.explorePage__albumGrid}>
                {unplayedData.albums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    cover={getCoverUrl(album.coverArtPath)}
                    title={album.name}
                    artist={album.artistName || 'Artista desconocido'}
                    onClick={() => navigateToAlbum(album.id)}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.explorePage__empty}>¡Has escuchado todos tus albums!</p>
            )}
          </section>

          {/* Forgotten Albums Section */}
          <section className={styles.explorePage__section}>
            <div className={styles.explorePage__sectionHeader}>
              <Clock size={24} className={styles.explorePage__sectionIcon} />
              <h2 className={styles.explorePage__sectionTitle}>Olvidados</h2>
              {forgottenData?.total && forgottenData.total > itemsPerRow && (
                <span className={styles.explorePage__count}>
                  {forgottenData.total} albums
                </span>
              )}
            </div>
            {loadingForgotten ? (
              <div className={styles.explorePage__loading}>Cargando...</div>
            ) : forgottenData?.albums && forgottenData.albums.length > 0 ? (
              <div className={styles.explorePage__albumGrid}>
                {forgottenData.albums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    cover={getCoverUrl(album.coverArtPath)}
                    title={album.name}
                    artist={album.artistName || 'Artista desconocido'}
                    onClick={() => navigateToAlbum(album.id)}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.explorePage__empty}>No tienes albums olvidados</p>
            )}
          </section>

          {/* Hidden Gems Section */}
          <section className={styles.explorePage__section}>
            <div className={styles.explorePage__sectionHeader}>
              <Sparkles size={24} className={styles.explorePage__sectionIcon} />
              <h2 className={styles.explorePage__sectionTitle}>Joyas ocultas</h2>
            </div>
            <p className={styles.explorePage__sectionHint}>
              Canciones poco escuchadas de tus artistas favoritos
            </p>
            {loadingGems ? (
              <div className={styles.explorePage__loading}>Cargando...</div>
            ) : hiddenGemsData?.tracks && hiddenGemsData.tracks.length > 0 ? (
              <div className={styles.explorePage__trackList}>
                {hiddenGemsData.tracks.map((track, index) => (
                  <div
                    key={track.id}
                    className={styles.trackItem}
                    onClick={() => track.albumId && navigateToAlbum(track.albumId)}
                  >
                    <span className={styles.trackItem__number}>{index + 1}</span>
                    <div className={styles.trackItem__cover}>
                      {track.coverArtPath ? (
                        <img
                          src={getCoverUrl(track.coverArtPath)}
                          alt={track.albumName || ''}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.trackItem__placeholder}>
                          <Disc size={20} />
                        </div>
                      )}
                    </div>
                    <div className={styles.trackItem__info}>
                      <h4 className={styles.trackItem__title}>{track.title}</h4>
                      <p className={styles.trackItem__artist}>{track.artistName}</p>
                    </div>
                    <span className={styles.trackItem__plays}>
                      {track.playCount} {track.playCount === 1 ? 'reproducción' : 'reproducciones'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.explorePage__empty}>
                Escucha más música para descubrir joyas ocultas
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
