import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shuffle, Clock, Sparkles, Disc, User, RefreshCw } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { useQueryClient } from '@tanstack/react-query';
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

  // Fetch data
  const { data: unplayedData, isLoading: loadingUnplayed } = useUnplayedAlbums(6);
  const { data: forgottenData, isLoading: loadingForgotten } = useForgottenAlbums(6);
  const { data: hiddenGemsData, isLoading: loadingGems } = useHiddenGems(10);
  const { data: randomData, isLoading: loadingRandom } = useRandomAlbums(6);

  const handleRefreshRandom = () => {
    queryClient.invalidateQueries({ queryKey: ['explore', 'random-albums'] });
  };

  const navigateToAlbum = (albumId: string) => {
    setLocation(`/albums/${albumId}`);
  };

  const navigateToArtist = (artistId: string) => {
    if (artistId) {
      setLocation(`/artists/${artistId}`);
    }
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
              <div className={styles.explorePage__sectionTitle}>
                <Shuffle size={24} />
                <h2>Sorpréndeme</h2>
              </div>
              <button
                className={styles.explorePage__refreshButton}
                onClick={handleRefreshRandom}
                title="Obtener otros aleatorios"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            {loadingRandom ? (
              <div className={styles.explorePage__loading}>Cargando...</div>
            ) : randomData?.albums && randomData.albums.length > 0 ? (
              <div className={styles.explorePage__grid}>
                {randomData.albums.map((album) => (
                  <div
                    key={album.id}
                    className={styles.albumCard}
                    onClick={() => navigateToAlbum(album.id)}
                  >
                    <div className={styles.albumCard__cover}>
                      {album.coverArtPath ? (
                        <img
                          src={`/api/albums/${album.id}/cover`}
                          alt={album.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.albumCard__placeholder}>
                          <Disc size={40} />
                        </div>
                      )}
                    </div>
                    <div className={styles.albumCard__info}>
                      <h3 className={styles.albumCard__title}>{album.name}</h3>
                      <p className={styles.albumCard__artist}>{album.artistName || 'Artista desconocido'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.explorePage__empty}>No hay albums disponibles</p>
            )}
          </section>

          {/* Unplayed Albums Section */}
          <section className={styles.explorePage__section}>
            <div className={styles.explorePage__sectionHeader}>
              <div className={styles.explorePage__sectionTitle}>
                <Disc size={24} />
                <h2>Sin escuchar</h2>
              </div>
              <span className={styles.explorePage__count}>
                {unplayedData?.total ?? 0} albums
              </span>
            </div>
            {loadingUnplayed ? (
              <div className={styles.explorePage__loading}>Cargando...</div>
            ) : unplayedData?.albums && unplayedData.albums.length > 0 ? (
              <div className={styles.explorePage__grid}>
                {unplayedData.albums.map((album) => (
                  <div
                    key={album.id}
                    className={styles.albumCard}
                    onClick={() => navigateToAlbum(album.id)}
                  >
                    <div className={styles.albumCard__cover}>
                      {album.coverArtPath ? (
                        <img
                          src={`/api/albums/${album.id}/cover`}
                          alt={album.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.albumCard__placeholder}>
                          <Disc size={40} />
                        </div>
                      )}
                    </div>
                    <div className={styles.albumCard__info}>
                      <h3 className={styles.albumCard__title}>{album.name}</h3>
                      <p className={styles.albumCard__artist}>{album.artistName || 'Artista desconocido'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.explorePage__empty}>¡Has escuchado todos tus albums!</p>
            )}
          </section>

          {/* Forgotten Albums Section */}
          <section className={styles.explorePage__section}>
            <div className={styles.explorePage__sectionHeader}>
              <div className={styles.explorePage__sectionTitle}>
                <Clock size={24} />
                <h2>Olvidados</h2>
              </div>
              <span className={styles.explorePage__count}>
                {forgottenData?.total ?? 0} albums
              </span>
            </div>
            {loadingForgotten ? (
              <div className={styles.explorePage__loading}>Cargando...</div>
            ) : forgottenData?.albums && forgottenData.albums.length > 0 ? (
              <div className={styles.explorePage__grid}>
                {forgottenData.albums.map((album) => (
                  <div
                    key={album.id}
                    className={styles.albumCard}
                    onClick={() => navigateToAlbum(album.id)}
                  >
                    <div className={styles.albumCard__cover}>
                      {album.coverArtPath ? (
                        <img
                          src={`/api/albums/${album.id}/cover`}
                          alt={album.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.albumCard__placeholder}>
                          <Disc size={40} />
                        </div>
                      )}
                    </div>
                    <div className={styles.albumCard__info}>
                      <h3 className={styles.albumCard__title}>{album.name}</h3>
                      <p className={styles.albumCard__artist}>{album.artistName || 'Artista desconocido'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.explorePage__empty}>No tienes albums olvidados</p>
            )}
          </section>

          {/* Hidden Gems Section */}
          <section className={styles.explorePage__section}>
            <div className={styles.explorePage__sectionHeader}>
              <div className={styles.explorePage__sectionTitle}>
                <Sparkles size={24} />
                <h2>Joyas ocultas</h2>
              </div>
              <span className={styles.explorePage__hint}>
                Canciones poco escuchadas de tus artistas favoritos
              </span>
            </div>
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
                          src={`/api/albums/${track.albumId}/cover`}
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
