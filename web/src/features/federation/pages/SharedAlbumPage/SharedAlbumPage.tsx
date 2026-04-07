import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'wouter';
import {
  Download,
  Check,
  Loader2,
  Server,
  Play,
  Shuffle,
  MoreHorizontal,
  AlertTriangle,
  X,
  Square,
} from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@shared/components/layout/Sidebar';
import { TrackList } from '@shared/components/TrackList';
import { useRemoteAlbum, useConnectedServers } from '../../hooks';
import { Button, Portal } from '@shared/components/ui';
import { handleImageError } from '@shared/utils/cover.utils';
import { useQueue, usePlayback } from '@features/player';
import { useAuthStore } from '@shared/store/authStore';
import { useDropdownMenu, useDominantColor, useDocumentTitle } from '@shared/hooks';
import type { Track } from '@shared/types/track.types';
import type { RemoteTrack } from '../../types';
import { useCoverLightbox } from './useCoverLightbox';
import { useAlbumImport } from './useAlbumImport';
import styles from './SharedAlbumPage.module.css';

/**
 * Página de álbum compartido desde un servidor federado.
 */
export default function SharedAlbumPage() {
  const { t } = useTranslation();
  const { serverId, albumId } = useParams<{ serverId: string; albumId: string }>();
  const [, setLocation] = useLocation();

  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.isAdmin === true;

  const { data: album, isLoading, error } = useRemoteAlbum(serverId, albumId);
  useDocumentTitle(album?.name);
  const dominantColor = useDominantColor(album?.coverUrl);
  const { data: servers } = useConnectedServers();

  const server = servers?.find((s) => s.id === serverId);
  const coverUrl = album?.coverUrl;
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

  // Extracted hooks
  const lightbox = useCoverLightbox(coverUrl);
  const {
    isImporting,
    isCompleted,
    isInProgress,
    isCancelling,
    importError,
    setImportError,
    handleImport,
    handleCancelImport,
  } = useAlbumImport({ serverId, albumId, serverName: server?.name });

  const { playQueue, setShuffle } = useQueue();
  const { currentTrack } = usePlayback();

  // Dropdown menu for options
  const {
    isOpen: isMenuOpen,
    isClosing: isMenuClosing,
    triggerRef: menuTriggerRef,
    dropdownRef: menuDropdownRef,
    effectivePosition: menuPosition,
    toggleMenu,
    handleOptionClick,
  } = useDropdownMenu({ offset: 8 });

  const convertToPlayableTracks = useCallback(
    (remoteTracks: RemoteTrack[]): Track[] => {
      if (!serverId || !album) return [];

      return remoteTracks.map((remoteTrack) => ({
        id: `${serverId}-${remoteTrack.id}`,
        title: remoteTrack.title,
        artistName: remoteTrack.artistName,
        artist: remoteTrack.artistName,
        albumId: album.id,
        albumName: album.name,
        trackNumber: remoteTrack.trackNumber,
        discNumber: remoteTrack.discNumber,
        duration: remoteTrack.duration,
        size: remoteTrack.size,
        bitRate: remoteTrack.bitRate,
        suffix: remoteTrack.format,
        coverImage: coverUrl,
        rgTrackGain: remoteTrack.rgTrackGain,
        rgTrackPeak: remoteTrack.rgTrackPeak,
        rgAlbumGain: remoteTrack.rgAlbumGain,
        rgAlbumPeak: remoteTrack.rgAlbumPeak,
        bpm: remoteTrack.bpm,
        outroStart: remoteTrack.outroStart,
        djAnalysis: remoteTrack.djAnalysis,
        streamUrl: `${API_BASE_URL}/federation/servers/${serverId}/tracks/${remoteTrack.id}/stream`,
      }));
    },
    [serverId, album, coverUrl, API_BASE_URL]
  );

  const playableTracks = useMemo(() => {
    if (!album?.tracks) return [];
    return convertToPlayableTracks(album.tracks);
  }, [album?.tracks, convertToPlayableTracks]);

  const handlePlayAll = useCallback(() => {
    if (playableTracks.length === 0) return;
    setShuffle(false);
    playQueue(playableTracks, 0, 'album');
  }, [playableTracks, playQueue, setShuffle]);

  const handleShufflePlay = useCallback(() => {
    if (playableTracks.length === 0) return;
    setShuffle(true);
    const shuffledTracks = [...playableTracks];
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }
    playQueue(shuffledTracks, 0, 'album');
  }, [playableTracks, playQueue, setShuffle]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (playableTracks.length === 0) return;
      const index = playableTracks.findIndex((t) => t.id === track.id);
      playQueue(playableTracks, index >= 0 ? index : 0, 'album');
    },
    [playableTracks, playQueue]
  );

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
              <p>{t('federation.loadingAlbum')}</p>
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
              <p>{t('federation.errorLoadingAlbum')}</p>
              <Button variant="secondary" onClick={() => setLocation('/home')}>
                {t('federation.backToHome')}
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const totalDuration =
    album.tracks?.reduce((acc, track) => acc + (track.duration || 0), 0) || album.duration || 0;

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
              transparent 60%)`,
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
                decoding="async"
                onError={handleImageError}
                onClick={lightbox.open}
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
                <span>{t('federation.federatedAlbum')}</span>
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
                <span>
                  {album.songCount} {t('federation.songs')}
                </span>
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
                  <span>{t('federation.fromServer', { name: server.name })}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className={styles.sharedAlbumPage__heroActions}>
                {/* Play button */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePlayAll}
                  leftIcon={<Play size={20} fill="currentColor" />}
                  disabled={playableTracks.length === 0}
                >
                  {t('albums.play')}
                </Button>

                {/* Shuffle button */}
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleShufflePlay}
                  leftIcon={<Shuffle size={20} />}
                  disabled={playableTracks.length === 0}
                >
                  {t('albums.shuffle')}
                </Button>

                {/* Options menu */}
                <div className={styles.sharedAlbumPage__optionsMenu}>
                  <button
                    ref={menuTriggerRef}
                    className={styles.sharedAlbumPage__optionsTrigger}
                    onClick={toggleMenu}
                    aria-label={t('federation.albumOptions')}
                    aria-expanded={isMenuOpen}
                    title={t('federation.moreOptions')}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {isMenuOpen && menuPosition && (
                  <Portal>
                    <div
                      ref={menuDropdownRef}
                      className={`${styles.sharedAlbumPage__optionsDropdown} ${isMenuClosing ? styles['sharedAlbumPage__optionsDropdown--closing'] : ''}`}
                      style={{
                        position: 'fixed',
                        top: menuPosition.top !== undefined ? `${menuPosition.top}px` : undefined,
                        bottom:
                          menuPosition.bottom !== undefined
                            ? `${menuPosition.bottom}px`
                            : undefined,
                        right:
                          menuPosition.right !== undefined ? `${menuPosition.right}px` : undefined,
                        left:
                          menuPosition.left !== undefined ? `${menuPosition.left}px` : undefined,
                        maxHeight: `${menuPosition.maxHeight}px`,
                        pointerEvents: isMenuClosing ? 'none' : 'auto',
                      }}
                      data-placement={menuPosition.placement}
                    >
                      {isAdmin && isInProgress && (
                        <button
                          className={`${styles.sharedAlbumPage__optionsOption} ${styles['sharedAlbumPage__optionsOption--danger']}`}
                          onClick={(e) => handleOptionClick(e, handleCancelImport)}
                          disabled={isCancelling}
                        >
                          {isCancelling ? (
                            <Loader2 size={16} className={styles.sharedAlbumPage__spinner} />
                          ) : (
                            <Square size={14} fill="currentColor" />
                          )}
                          <span>
                            {isCancelling
                              ? t('federation.cancelling')
                              : t('federation.cancelImport')}
                          </span>
                        </button>
                      )}
                      {isAdmin && !isInProgress && (
                        <button
                          className={styles.sharedAlbumPage__optionsOption}
                          onClick={(e) => handleOptionClick(e, handleImport)}
                          disabled={isImporting || isCompleted}
                        >
                          {isImporting ? (
                            <Loader2 size={16} className={styles.sharedAlbumPage__spinner} />
                          ) : isCompleted ? (
                            <Check size={16} />
                          ) : (
                            <Download size={16} />
                          )}
                          <span>
                            {isCompleted
                              ? t('federation.albumImported')
                              : isImporting
                                ? t('federation.importing')
                                : t('federation.importToServer')}
                          </span>
                        </button>
                      )}
                    </div>
                  </Portal>
                )}
              </div>
            </div>
          </div>

          {/* Error banner */}
          {importError && (
            <div className={styles.sharedAlbumPage__errorBanner} role="alert">
              <AlertTriangle size={20} />
              <div className={styles.sharedAlbumPage__errorContent}>
                <span className={styles.sharedAlbumPage__errorMessage}>{importError}</span>
              </div>
              <button
                className={styles.sharedAlbumPage__errorClose}
                onClick={() => setImportError(null)}
                aria-label={t('common.close')}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Track listing - using shared TrackList component */}
          <div className={styles.sharedAlbumPage__trackSection}>
            {playableTracks.length > 0 ? (
              <TrackList
                tracks={playableTracks}
                onTrackPlay={handlePlayTrack}
                currentTrackId={currentTrack?.id}
                hideGoToAlbum={true}
                hideAlbumCover={true}
                hideRating={true}
              />
            ) : (
              <div className={styles.sharedAlbumPage__emptyTracks}>
                <p>{t('federation.noTracksFound')}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Modal/Lightbox */}
      {lightbox.isOpen && coverUrl && (
        <div className={styles.sharedAlbumPage__imageModal} onClick={lightbox.close}>
          <div
            className={styles.sharedAlbumPage__imageModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={coverUrl}
              alt={album.name}
              className={styles.sharedAlbumPage__imageModalImage}
              onError={handleImageError}
            />
            {lightbox.coverDimensions && (
              <div className={styles.sharedAlbumPage__imageDimensions}>
                {lightbox.coverDimensions.width} x {lightbox.coverDimensions.height} px
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
