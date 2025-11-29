import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shuffle, Clock, Sparkles, Disc, RefreshCw, Play } from 'lucide-react';
import { Sidebar, AlbumGrid } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { useQueryClient } from '@tanstack/react-query';
import { useGridDimensions } from '@features/home/hooks';
import { tracksService } from '@features/home/services/tracks.service';
import { usePlayer } from '@features/player';
import { getCoverUrl } from '@shared/utils/cover.utils';
import type { Track } from '@shared/types/track.types';
import {
  useUnplayedAlbums,
  useForgottenAlbums,
  useHiddenGems,
  useRandomAlbums,
} from '../../hooks/useExplore';
import { toAlbum } from '../../utils/transform';
import styles from './ExplorePage.module.css';

/**
 * ExplorePage Component
 * Discovery section with unplayed albums, forgotten albums, hidden gems, and random picks
 */
export default function ExplorePage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { playQueue } = usePlayer();
  const [isShuffleLoading, setIsShuffleLoading] = useState(false);

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

  /**
   * Play all library tracks in random order
   * Fetches shuffled tracks from backend and plays them
   */
  const handleShufflePlay = async () => {
    if (isShuffleLoading) return;

    setIsShuffleLoading(true);
    try {
      const { data: shuffledTracks } = await tracksService.getShuffled();

      if (shuffledTracks.length === 0) {
        return;
      }

      // Convert to player format
      const playerTracks: Track[] = shuffledTracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artistName || 'Artista desconocido',
        artistId: track.artistId,
        albumId: track.albumId,
        albumName: track.albumName,
        duration: track.duration,
        coverImage: track.albumId ? `/api/images/albums/${track.albumId}/cover` : undefined,
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
      }));

      playQueue(playerTracks, 0);
    } catch (error) {
      console.error('Error loading shuffled tracks:', error);
    } finally {
      setIsShuffleLoading(false);
    }
  };

  const navigateToAlbum = (albumId: string) => {
    setLocation(`/album/${albumId}`);
  };

  // Transform explore albums to Album type
  const randomAlbums = randomData?.albums?.map(toAlbum) || [];
  const unplayedAlbums = unplayedData?.albums?.map(toAlbum) || [];
  const forgottenAlbums = forgottenData?.albums?.map(toAlbum) || [];

  return (
    <div className={styles.explorePage}>
      <Sidebar />

      <main className={styles.explorePage__main}>
        <Header disableSearch />

        <div className={styles.explorePage__content}>
          {/* Page Header */}
          <div className={styles.explorePage__header}>
            <div className={styles.explorePage__headerTop}>
              <div>
                <h1 className={styles.explorePage__title}>Explorar</h1>
                <p className={styles.explorePage__subtitle}>
                  Descubre música en tu biblioteca
                </p>
              </div>
              <button
                className={styles.explorePage__shuffleAllButton}
                onClick={handleShufflePlay}
                disabled={isShuffleLoading}
                title="Reproducir toda la biblioteca en orden aleatorio"
              >
                {isShuffleLoading ? (
                  <RefreshCw size={20} className={styles.explorePage__spinning} />
                ) : (
                  <Shuffle size={20} />
                )}
                <span>{isShuffleLoading ? 'Cargando...' : 'Reproducir todo aleatorio'}</span>
              </button>
            </div>
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
            ) : randomAlbums.length > 0 ? (
              <AlbumGrid title="" albums={randomAlbums} />
            ) : (
              <p className={styles.explorePage__empty}>No hay albums disponibles</p>
            )}
          </section>

          {/* Unplayed Albums Section */}
          <section className={styles.explorePage__section}>
            <div className={styles.explorePage__sectionHeader}>
              <Disc size={24} className={styles.explorePage__sectionIcon} />
              <h2 className={styles.explorePage__sectionTitle}>Sin escuchar</h2>
            </div>
            {unplayedData?.total && unplayedData.total > itemsPerRow && (
              <button
                className={styles.explorePage__viewAllButton}
                onClick={() => setLocation('/explore/unplayed')}
              >
                Ver todos ({unplayedData.total}) →
              </button>
            )}
            {loadingUnplayed ? (
              <div className={styles.explorePage__loading}>Cargando...</div>
            ) : unplayedAlbums.length > 0 ? (
              <AlbumGrid title="" albums={unplayedAlbums} />
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
            ) : forgottenAlbums.length > 0 ? (
              <AlbumGrid title="" albums={forgottenAlbums} />
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
                      <img
                        src={track.albumId ? `/api/images/albums/${track.albumId}/cover` : getCoverUrl(null)}
                        alt={track.albumName || ''}
                        loading="lazy"
                      />
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
