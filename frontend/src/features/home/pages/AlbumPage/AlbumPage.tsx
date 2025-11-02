import { useParams, useLocation } from 'wouter';
import { ChevronLeft, Play, MoreHorizontal } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, TrackList } from '../../components';
import { useAlbum, useAlbumTracks } from '../../hooks/useAlbums';
import { Button } from '@shared/components/ui';
import styles from './AlbumPage.module.css';

/**
 * AlbumPage Component
 * Displays album details and track listing
 */
export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: album, isLoading: loadingAlbum, error: albumError } = useAlbum(id!);
  const { data: tracks, isLoading: loadingTracks } = useAlbumTracks(id!);

  const handleBack = () => {
    setLocation('/home');
  };

  const handlePlayAll = () => {
    console.log('Playing all tracks from album:', id);
    // TODO: Implement play all functionality
  };

  const handleTrackPlay = (track: any) => {
    console.log('Playing track:', track.id);
    // TODO: Implement single track play functionality
  };

  if (loadingAlbum) {
    return (
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.main}>
          <Header />
          <div className={styles.content}>
            <div className={styles.loadingState}>
              <p>Cargando álbum...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (albumError || !album) {
    return (
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.main}>
          <Header />
          <div className={styles.content}>
            <div className={styles.errorState}>
              <p>Error al cargar el álbum</p>
              <Button onClick={handleBack}>Volver al inicio</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totalDuration = tracks?.reduce((acc, track) => acc + (track.duration || 0), 0) || 0;
  const totalMinutes = Math.floor(totalDuration / 60);

  return (
    <div className={styles.container}>
      <Sidebar />

      <main className={styles.main}>
        <Header />

        <div className={styles.content}>
          {/* Back button */}
          <button className={styles.backButton} onClick={handleBack}>
            <ChevronLeft size={20} />
            <span>Volver</span>
          </button>

          {/* Album hero section */}
          <div className={styles.albumHero}>
            {/* Album cover */}
            <img
              src={album.coverImage}
              alt={album.title}
              className={styles.albumCover}
            />

            {/* Album info */}
            <div className={styles.albumInfo}>
              <span className={styles.albumType}>Álbum</span>
              <h1 className={styles.albumTitle}>{album.title}</h1>
              <div className={styles.albumMeta}>
                <span className={styles.albumArtist}>{album.artist}</span>
                <span className={styles.metaDivider}>•</span>
                <span>{album.year}</span>
                <span className={styles.metaDivider}>•</span>
                <span>{album.totalTracks} canciones</span>
                {totalMinutes > 0 && (
                  <>
                    <span className={styles.metaDivider}>•</span>
                    <span>{totalMinutes} min</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className={styles.actions}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePlayAll}
                  leftIcon={<Play size={20} fill="currentColor" />}
                >
                  Reproducir
                </Button>
                <button className={styles.moreButton} aria-label="More options">
                  <MoreHorizontal size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Track listing */}
          <div className={styles.trackSection}>
            {loadingTracks ? (
              <div className={styles.loadingTracks}>
                <p>Cargando canciones...</p>
              </div>
            ) : tracks && tracks.length > 0 ? (
              <TrackList tracks={tracks} onTrackPlay={handleTrackPlay} />
            ) : (
              <div className={styles.emptyTracks}>
                <p>No se encontraron canciones en este álbum</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
