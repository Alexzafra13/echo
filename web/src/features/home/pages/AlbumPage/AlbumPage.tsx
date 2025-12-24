import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Shuffle } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, TrackList, AlbumOptionsMenu, AlbumInfoModal, AlbumCard } from '../../components';
import { AlbumCoverSelectorModal } from '@features/admin/components/AlbumCoverSelectorModal';
import { useAlbum, useAlbumTracks } from '../../hooks/useAlbums';
import { useArtistAlbums } from '@features/artists/hooks';
import { usePlayer, Track } from '@features/player';
import { useAlbumMetadataSync } from '@shared/hooks';
import { Button } from '@shared/components/ui';
import { extractDominantColor } from '@shared/utils/colorExtractor';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { getArtistImageUrl, useAlbumCoverMetadata, getAlbumCoverUrl, useArtistImages } from '../../hooks';
import { logger } from '@shared/utils/logger';
import { downloadService } from '@shared/services/download.service';
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
  const { playQueue, currentTrack, setShuffle } = usePlayer();

  // Real-time synchronization via WebSocket for album cover
  useAlbumMetadataSync(id);

  const { data: album, isLoading: loadingAlbum, error: albumError } = useAlbum(id!);
  const { data: tracks, isLoading: loadingTracks } = useAlbumTracks(id!);

  // Fetch other albums from the same artist
  const { data: artistAlbumsData } = useArtistAlbums(album?.artistId);

  // Filter out the current album from artist's discography
  const moreFromArtist = useMemo(() => {
    if (!artistAlbumsData?.data || !id) return [];
    return artistAlbumsData.data.filter(a => a.id !== id);
  }, [artistAlbumsData?.data, id]);

  // Fetch artist images metadata for tag-based cache busting on artist avatar
  const { data: artistImages } = useArtistImages(album?.artistId);
  // Fetch cover metadata with tag for cache busting
  const { data: coverMeta } = useAlbumCoverMetadata(id);

  // Derive cover key from metadata tag instead of using unnecessary state
  const coverKey = useMemo(
    () => coverMeta?.cover.tag || 'default',
    [coverMeta?.cover.tag]
  );

  // Get cover URL with tag-based cache busting
  const coverUrl = id && coverMeta?.cover.exists
    ? getAlbumCoverUrl(id, coverMeta.cover.tag)
    : getCoverUrl(album?.coverImage);

  // Debug: Log cover metadata changes
  useEffect(() => {
    if (coverMeta) {
      logger.debug('[AlbumPage] 📊 Cover metadata updated:', {
        albumId: id,
        exists: coverMeta.cover.exists,
        tag: coverMeta.cover.tag,
        lastModified: coverMeta.cover.lastModified,
        source: coverMeta.cover.source
      });
    }
  }, [coverMeta, id]);

  // Extract dominant color from album cover
  useEffect(() => {
    if (coverUrl) {
      extractDominantColor(coverUrl).then(color => {
        setDominantColor(color);
      });
    }
  }, [coverUrl]);

  // Preload cover image when URL changes (cache busting handled by coverKey)
  useEffect(() => {
    if (coverUrl && coverMeta?.cover.tag) {
      const cacheBustUrl = coverUrl.includes('?')
        ? `${coverUrl}&_cb=${Date.now()}`
        : `${coverUrl}?_cb=${Date.now()}`;

      logger.debug('[AlbumPage] 🔄 Preloading cover with cache bust:', cacheBustUrl);
      logger.debug('[AlbumPage] 📌 Current tag:', coverMeta.cover.tag);

      const img = new window.Image();
      img.src = cacheBustUrl;
      img.onload = () => {
        logger.debug('[AlbumPage] ✅ Cover image preloaded successfully');
      };
      img.onerror = () => {
        logger.error('[AlbumPage] ❌ Failed to preload cover');
      };
    }
  }, [coverUrl, coverMeta]);

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
      artistId: track.artistId || album?.artistId,
      albumId: id,
      albumName: album?.title,
      duration: track.duration || 0,
      coverImage: album?.coverImage,
      // Audio normalization data (LUFS)
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
    }));
  };

  const handlePlayAll = () => {
    if (!tracks || tracks.length === 0) return;
    // Disable shuffle mode for ordered playback
    setShuffle(false);
    const playerTracks = convertToPlayerTracks(tracks);
    playQueue(playerTracks, 0);
  };

  const handleShufflePlay = () => {
    if (!tracks || tracks.length === 0) return;
    const playerTracks = convertToPlayerTracks(tracks);
    // Enable shuffle mode
    setShuffle(true);
    // Shuffle the tracks array using Fisher-Yates algorithm
    // This ensures true random order - navigation will advance sequentially through shuffled queue
    const shuffledTracks = [...playerTracks];
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }
    playQueue(shuffledTracks, 0);
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
    logger.debug('Add album to playlist - to be implemented');
  };

  const handleDownloadAlbum = async () => {
    if (!album || !id) return;
    try {
      logger.info('Starting album download:', { albumId: id, title: album.title });
      await downloadService.downloadAlbum(id, album.title, album.artist);
    } catch (error) {
      logger.error('Failed to download album:', error);
    }
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
          <Header showBackButton disableSearch />
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
          <Header showBackButton disableSearch />
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
        <Header showBackButton disableSearch />

        <div
          className={styles.albumPage__content}
          style={{
            background: `linear-gradient(180deg,
              rgba(${dominantColor}, 0.4) 0%,
              rgba(${dominantColor}, 0.2) 25%,
              transparent 60%)`
          }}
        >
          {/* Album hero section */}
          <div className={styles.albumPage__hero}>
            {/* Album cover */}
            <img
              key={`cover-${coverKey}`}
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
                      src={getArtistImageUrl(album.artistId, 'profile', artistImages?.images.profile?.tag)}
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
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleShufflePlay}
                  leftIcon={<Shuffle size={20} />}
                >
                  Aleatorio
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

          {/* More from this artist */}
          {moreFromArtist.length > 0 && (
            <div className={styles.albumPage__moreFromArtist}>
              <h2 className={styles.albumPage__moreFromArtistTitle}>
                Más de {album.artist}
              </h2>
              <div className={styles.albumPage__moreFromArtistGrid}>
                {moreFromArtist.map((otherAlbum) => (
                  <AlbumCard
                    key={otherAlbum.id}
                    cover={otherAlbum.coverImage}
                    title={otherAlbum.title}
                    artist={otherAlbum.artist}
                    onClick={() => setLocation(`/album/${otherAlbum.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
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
              key={`modal-cover-${coverKey}`}
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
