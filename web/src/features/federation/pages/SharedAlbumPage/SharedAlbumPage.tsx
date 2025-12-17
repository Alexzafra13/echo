import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Download, Check, Loader2, Server } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useRemoteAlbum, useConnectedServers, useStartImport } from '../../hooks';
import { Button } from '@shared/components/ui';
import { extractDominantColor } from '@shared/utils/colorExtractor';
import { handleImageError } from '@shared/utils/cover.utils';
import type { RemoteTrack } from '../../types';
import styles from './SharedAlbumPage.module.css';

/**
 * SharedAlbumPage Component
 * Displays album details from a federated server
 */
export default function SharedAlbumPage() {
  const { serverId, albumId } = useParams<{ serverId: string; albumId: string }>();
  const [, setLocation] = useLocation();
  const [dominantColor, setDominantColor] = useState<string>('10, 14, 39');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [coverDimensions, setCoverDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);

  const { data: album, isLoading, error } = useRemoteAlbum(serverId, albumId);
  const { data: servers } = useConnectedServers();
  const startImport = useStartImport();

  const server = servers?.find(s => s.id === serverId);
  const coverUrl = album?.coverUrl;

  // Extract dominant color from album cover
  useEffect(() => {
    if (coverUrl) {
      extractDominantColor(coverUrl).then(color => {
        setDominantColor(color);
      });
    }
  }, [coverUrl]);

  // Load cover dimensions when modal opens
  useEffect(() => {
    if (isImageModalOpen && coverUrl) {
      const img = new window.Image();
      img.onload = () => {
        setCoverDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = coverUrl;
    } else if (!isImageModalOpen) {
      setCoverDimensions(null);
    }
  }, [isImageModalOpen, coverUrl]);

  const handleImport = async () => {
    if (!serverId || !albumId || isImporting || isImported) return;

    setIsImporting(true);
    try {
      await startImport.mutateAsync({ serverId, remoteAlbumId: albumId });
      setIsImported(true);
    } catch (error) {
      console.error('Failed to start import:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }
    return `${minutes} min`;
  };

  if (isLoading) {
    return (
      <div className={styles.sharedAlbumPage}>
        <Sidebar />
        <main className={styles.sharedAlbumPage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.sharedAlbumPage__content}>
            <div className={styles.sharedAlbumPage__loadingState}>
              <Loader2 size={32} className={styles.sharedAlbumPage__spinner} />
              <p>Cargando album...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className={styles.sharedAlbumPage}>
        <Sidebar />
        <main className={styles.sharedAlbumPage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.sharedAlbumPage__content}>
            <div className={styles.sharedAlbumPage__errorState}>
              <p>Error al cargar el album</p>
              <Button variant="secondary" onClick={() => setLocation('/home')}>
                Volver al inicio
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totalDuration = album.tracks?.reduce((acc, track) => acc + (track.duration || 0), 0) || album.duration || 0;

  return (
    <div className={styles.sharedAlbumPage}>
      <Sidebar />

      <main className={styles.sharedAlbumPage__main}>
        <Header showBackButton disableSearch />

        <div
          className={styles.sharedAlbumPage__content}
          style={{
            background: `linear-gradient(180deg,
              rgba(${dominantColor}, 0.4) 0%,
              rgba(${dominantColor}, 0.2) 25%,
              transparent 60%)`
          }}
        >
          {/* Album hero section */}
          <div className={styles.sharedAlbumPage__hero}>
            {/* Album cover */}
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={album.name}
                className={styles.sharedAlbumPage__heroCover}
                onError={handleImageError}
                onClick={() => setIsImageModalOpen(true)}
              />
            ) : (
              <div className={styles.sharedAlbumPage__heroCoverPlaceholder}>
                <span>🎵</span>
              </div>
            )}

            {/* Album info */}
            <div className={styles.sharedAlbumPage__heroInfo}>
              <div className={styles.sharedAlbumPage__heroType}>
                <Server size={14} />
                <span>Album Federado</span>
              </div>
              <h1 className={styles.sharedAlbumPage__heroTitle}>{album.name}</h1>
              <div className={styles.sharedAlbumPage__heroMeta}>
                <span className={styles.sharedAlbumPage__heroArtist}>{album.artistName}</span>
                <span className={styles.sharedAlbumPage__heroDivider}>•</span>
                {album.year && (
                  <>
                    <span>{album.year}</span>
                    <span className={styles.sharedAlbumPage__heroDivider}>•</span>
                  </>
                )}
                <span>{album.songCount} canciones</span>
                {totalDuration > 0 && (
                  <>
                    <span className={styles.sharedAlbumPage__heroDivider}>•</span>
                    <span>{formatTotalDuration(totalDuration)}</span>
                  </>
                )}
              </div>

              {server && (
                <div className={styles.sharedAlbumPage__serverBadge}>
                  <Server size={14} />
                  <span>Desde {server.name}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className={styles.sharedAlbumPage__heroActions}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleImport}
                  disabled={isImporting || isImported}
                  leftIcon={
                    isImporting ? (
                      <Loader2 size={20} className={styles.sharedAlbumPage__spinner} />
                    ) : isImported ? (
                      <Check size={20} />
                    ) : (
                      <Download size={20} />
                    )
                  }
                >
                  {isImported ? 'Importado' : isImporting ? 'Importando...' : 'Importar'}
                </Button>
              </div>
            </div>
          </div>

          {/* Track listing */}
          <div className={styles.sharedAlbumPage__trackSection}>
            {album.tracks && album.tracks.length > 0 ? (
              <div className={styles.sharedAlbumPage__trackList}>
                <div className={styles.sharedAlbumPage__trackHeader}>
                  <span className={styles.sharedAlbumPage__trackNumber}>#</span>
                  <span className={styles.sharedAlbumPage__trackTitle}>Titulo</span>
                  <span className={styles.sharedAlbumPage__trackDuration}>Duracion</span>
                </div>
                {album.tracks.map((track: RemoteTrack, index: number) => (
                  <div key={track.id} className={styles.sharedAlbumPage__trackRow}>
                    <span className={styles.sharedAlbumPage__trackNumber}>
                      {track.trackNumber || index + 1}
                    </span>
                    <div className={styles.sharedAlbumPage__trackInfo}>
                      <span className={styles.sharedAlbumPage__trackName}>{track.title}</span>
                      <span className={styles.sharedAlbumPage__trackArtist}>{track.artistName}</span>
                    </div>
                    <span className={styles.sharedAlbumPage__trackDuration}>
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.sharedAlbumPage__emptyTracks}>
                <p>No se encontraron canciones en este album</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Modal/Lightbox */}
      {isImageModalOpen && coverUrl && (
        <div
          className={styles.sharedAlbumPage__imageModal}
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className={styles.sharedAlbumPage__imageModalContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={coverUrl}
              alt={album.name}
              className={styles.sharedAlbumPage__imageModalImage}
              onError={handleImageError}
            />
            {coverDimensions && (
              <div className={styles.sharedAlbumPage__imageDimensions}>
                {coverDimensions.width} x {coverDimensions.height} px
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
