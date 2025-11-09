import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, TrackList, AlbumOptionsMenu, AlbumInfoModal } from '../../components';
import { AlbumCoverSelectorModal } from '@features/admin/components/AlbumCoverSelectorModal';
import { useAlbum, useAlbumTracks } from '../../hooks/useAlbums';
import { usePlayer, Track } from '@features/player';
import { useAlbumMetadataSync } from '@shared/hooks';
import { Button } from '@shared/components/ui';
import { extractDominantColor } from '@shared/utils/colorExtractor';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { getArtistImageUrl, useAlbumCoverMetadata, getAlbumCoverUrl } from '../../hooks';
import styles from './AlbumPage.module.css';

/**
 * AlbumPage Component
 * Displays album details and track listing with dynamic color from album cover
 */
export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [dominantColor, setDominantColor] = useState<string>('10, 14, 39'); // Default dark blue
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isCoverSelectorOpen, setIsCoverSelectorOpen] = useState(false);
  const [coverDimensions, setCoverDimensions] = useState<{ width: number; height: number } | null>(null);
  const [coverRenderKey, setCoverRenderKey] = useState(0); // Force re-render when cover changes
  const { playQueue, currentTrack } = usePlayer();

  // Real-time synchronization via WebSocket for album cover
  useAlbumMetadataSync(id);

  const { data: album, isLoading: loadingAlbum, error: albumError } = useAlbum(id!);
  const { data: tracks, isLoading: loadingTracks } = useAlbumTracks(id!);

  // Fetch cover metadata with tag for cache busting
  const { data: coverMeta } = useAlbumCoverMetadata(id);

  // Get cover URL with tag-based cache busting
  const coverUrl = id && coverMeta?.cover.exists
    ? getAlbumCoverUrl(id, coverMeta.cover.tag)
    : getCoverUrl(album?.coverImage);

  // Extract dominant color from album cover
  useEffect(() => {
    if (coverUrl) {
      extractDominantColor(coverUrl).then(color => {
        setDominantColor(color);
      });
    }
  }, [coverUrl]);

  // CRITICAL: Force browser to reload cover image when URL changes
  // This preloads the image to ensure browser cache is updated
  useEffect(() => {
    if (coverUrl) {
      console.log('[AlbumPage] 🔄 Preloading cover:', coverUrl);
      const img = new window.Image();
      img.src = coverUrl;
      img.onload = () => {
        console.log('[AlbumPage] ✅ Cover image preloaded successfully');
        setCoverRenderKey(prev => prev + 1); // Force component re-render
      };
      img.onerror = () => {
        console.error('[AlbumPage] ❌ Failed to preload cover');
      };
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
      setCoverDimensions(null); // Reset when modal closes
    }
  }, [isImageModalOpen, coverUrl]);

  const handleArtistClick = () => {
    if (album?.artistId) {
      setLocation(`/artists/${album.artistId}`);
    }
  };

  // Convert API tracks to Player tracks
  const convertToPlayerTracks = (apiTracks: any[]): Track[] => {
    return apiTracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artistName || album?.artist || 'Unknown Artist',
      albumName: album?.title,
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

  const handleShowAlbumInfo = () => {
    setIsInfoModalOpen(true);
  };

  const handleAddAlbumToPlaylist = () => {
    // TODO: Implement add album to playlist
    console.log('Add album to playlist - to be implemented');
  };

  const handleDownloadAlbum = () => {
    // TODO: Implement download album
    console.log('Download album - to be implemented');
  };

  const handleChangeCover = () => {
    setIsCoverSelectorOpen(true);
  };

  const handleCoverChanged = () => {
    // Force immediate refetch to update album data with new cover
    queryClient.refetchQueries({
      queryKey: ['album', id],
      type: 'active'
    });
    queryClient.refetchQueries({
      queryKey: ['album-cover-metadata', id],
      type: 'active'
    });

    // Close the modal
    setIsCoverSelectorOpen(false);
  };

  if (loadingAlbum) {
    return (
      <div className={styles.albumPage}>
        <Sidebar />
        <main className={styles.albumPage__main}>
          <Header showBackButton />
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
          <Header showBackButton />
          <div className={styles.albumPage__content}>
            <div className={styles.albumPage__errorState}>
              <p>Error al cargar el álbum</p>
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
        <Header showBackButton />

        <div
          className={styles.albumPage__content}
          style={{
            background: `linear-gradient(180deg,
              rgba(${dominantColor}, 0.6) 0%,
              rgba(${dominantColor}, 0.3) 25%,
              rgba(10, 14, 39, 1) 60%)`
          }}
        >
          {/* Album hero section */}
          <div className={styles.albumPage__hero}>
            {/* Album cover */}
            <img
              key={`cover-${coverRenderKey}`}
              src={coverUrl}
              alt={album.title}
              className={styles.albumPage__heroCover}
              onError={handleImageError}
              onClick={() => setIsImageModalOpen(true)}
            />

            {/* Album info */}
            <div className={styles.albumPage__heroInfo}>
              <span className={styles.albumPage__heroType}>Álbum</span>
              <h1 className={styles.albumPage__heroTitle}>{album.title}</h1>
              <div className={styles.albumPage__heroMeta}>
                <button
                  className={styles.albumPage__heroArtistButton}
                  onClick={handleArtistClick}
                  title={`Ver perfil de ${album.artist}`}
                >
                  {album.artistId && (
                    <img
                      src={getArtistImageUrl(album.artistId, 'profile')}
                      alt={album.artist}
                      className={styles.albumPage__heroArtistAvatar}
                      onError={(e) => {
                        e.currentTarget.src = '/images/avatar-default.svg';
                      }}
                    />
                  )}
                  {album.artist}
                </button>
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
                <AlbumOptionsMenu
                  onShowInfo={handleShowAlbumInfo}
                  onAddToPlaylist={handleAddAlbumToPlaylist}
                  onDownload={handleDownloadAlbum}
                  onChangeCover={handleChangeCover}
                />
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
              <TrackList tracks={tracks} onTrackPlay={handleTrackPlay} currentTrackId={currentTrack?.id} hideGoToAlbum={true} hideAlbumCover={true} />
            ) : (
              <div className={styles.albumPage__emptyTracks}>
                <p>No se encontraron canciones en este álbum</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Modal/Lightbox */}
      {isImageModalOpen && (
        <div
          className={styles.albumPage__imageModal}
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className={styles.albumPage__imageModalContent} onClick={(e) => e.stopPropagation()}>
            <img
              key={`modal-cover-${coverRenderKey}`}
              src={coverUrl}
              alt={album.title}
              className={styles.albumPage__imageModalImage}
              onError={handleImageError}
            />
            {coverDimensions && (
              <div className={styles.albumPage__imageDimensions}>
                {coverDimensions.width} × {coverDimensions.height} px
              </div>
            )}
          </div>
        </div>
      )}

      {/* Album Info Modal */}
      {isInfoModalOpen && album && (
        <AlbumInfoModal
          album={album}
          tracks={tracks || []}
          onClose={() => setIsInfoModalOpen(false)}
        />
      )}

      {/* Album Cover Selector Modal */}
      {isCoverSelectorOpen && album && (
        <AlbumCoverSelectorModal
          albumId={album.id}
          albumName={album.title}
          onClose={() => setIsCoverSelectorOpen(false)}
          onSuccess={handleCoverChanged}
        />
      )}
    </div>
  );
}
