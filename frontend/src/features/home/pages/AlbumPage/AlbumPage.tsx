import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ChevronLeft, Play, MoreHorizontal } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, TrackList } from '../../components';
import { useAlbum, useAlbumTracks } from '../../hooks/useAlbums';
import { usePlayer, Track } from '@features/player';
import { Button } from '@shared/components/ui';
import { extractDominantColor } from '@shared/utils/colorExtractor';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import styles from './AlbumPage.module.css';

/**
 * AlbumPage Component
 * Displays album details and track listing with dynamic color from album cover
 */
export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [dominantColor, setDominantColor] = useState<string>('10, 14, 39'); // Default dark blue
  const { playQueue } = usePlayer();

  const { data: album, isLoading: loadingAlbum, error: albumError } = useAlbum(id!);
  const { data: tracks, isLoading: loadingTracks } = useAlbumTracks(id!);

  // Extract dominant color from album cover
  useEffect(() => {
    if (album?.coverImage) {
      const coverUrl = getCoverUrl(album.coverImage);
      extractDominantColor(coverUrl).then(color => {
        setDominantColor(color);
      });
    }
  }, [album?.coverImage]);

  const handleBack = () => {
    setLocation('/home');
  };

  // Convert API tracks to Player tracks
  const convertToPlayerTracks = (apiTracks: any[]): Track[] => {
    return apiTracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist?.name || album?.artist?.name || 'Unknown Artist',
      albumName: album?.name,
      duration: track.duration || 0,
      coverImage: album?.coverImage,
    }));
  };

  const handlePlayAll = () => {
    if (!tracks || tracks.length === 0) return;
    const playerTracks = convertToPlayerTracks(tracks);
    playQueue(playerTracks, 0);
  };

  const handleTrackPlay = (track: any) => {
    if (!tracks) return;
    const playerTracks = convertToPlayerTracks(tracks);
    const trackIndex = tracks.findIndex(t => t.id === track.id);
    playQueue(playerTracks, trackIndex >= 0 ? trackIndex : 0);
  };

  if (loadingAlbum) {
    return (
      <div className={styles.albumPage}>
        <Sidebar />
        <main className={styles.albumPage__main}>
          <Header />
          <div className={styles.albumPage__content}>
            <div className={styles.albumPage__loadingState}>
              <p>Cargando álbum...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (albumError || !album) {
    return (
      <div className={styles.albumPage}>
        <Sidebar />
        <main className={styles.albumPage__main}>
          <Header />
          <div className={styles.albumPage__content}>
            <div className={styles.albumPage__errorState}>
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
    <div className={styles.albumPage}>
      <Sidebar />

      <main className={styles.albumPage__main}>
        <Header />

        <div
          className={styles.albumPage__content}
          style={{
            background: `linear-gradient(180deg,
              rgba(${dominantColor}, 0.6) 0%,
              rgba(${dominantColor}, 0.3) 25%,
              rgba(10, 14, 39, 1) 60%)`
          }}
        >
          {/* Back button */}
          <button className={styles.albumPage__backButton} onClick={handleBack}>
            <ChevronLeft size={20} />
            <span>Volver</span>
          </button>

          {/* Album hero section */}
          <div className={styles.albumPage__hero}>
            {/* Album cover */}
            <img
              src={getCoverUrl(album.coverImage)}
              alt={album.title}
              className={styles.albumPage__heroCover}
              onError={handleImageError}
            />

            {/* Album info */}
            <div className={styles.albumPage__heroInfo}>
              <span className={styles.albumPage__heroType}>Álbum</span>
              <h1 className={styles.albumPage__heroTitle}>{album.title}</h1>
              <div className={styles.albumPage__heroMeta}>
                <span className={styles.albumPage__heroArtist}>{album.artist}</span>
                <span className={styles.albumPage__heroDivider}>•</span>
                <span>{album.year}</span>
                <span className={styles.albumPage__heroDivider}>•</span>
                <span>{album.totalTracks} canciones</span>
                {totalMinutes > 0 && (
                  <>
                    <span className={styles.albumPage__heroDivider}>•</span>
                    <span>{totalMinutes} min</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className={styles.albumPage__heroActions}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePlayAll}
                  leftIcon={<Play size={20} fill="currentColor" />}
                >
                  Reproducir
                </Button>
                <button className={styles.albumPage__heroMoreButton} aria-label="More options">
                  <MoreHorizontal size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Track listing */}
          <div className={styles.albumPage__trackSection}>
            {loadingTracks ? (
              <div className={styles.albumPage__loadingTracks}>
                <p>Cargando canciones...</p>
              </div>
            ) : tracks && tracks.length > 0 ? (
              <TrackList tracks={tracks} onTrackPlay={handleTrackPlay} />
            ) : (
              <div className={styles.albumPage__emptyTracks}>
                <p>No se encontraron canciones en este álbum</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
