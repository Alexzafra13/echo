import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { Download, Check, Loader2, Server, Play, Pause, Shuffle, MoreHorizontal, AlertTriangle, X } from 'lucide-react';
import { AxiosError } from 'axios';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useRemoteAlbum, useConnectedServers, useStartImport } from '../../hooks';
import { Button, Portal } from '@shared/components/ui';
import { handleImageError } from '@shared/utils/cover.utils';
import { usePlayer } from '@features/player/context/PlayerContext';
import { useDropdownMenu, useModal, useDominantColor, useDocumentTitle } from '@shared/hooks';
import { logger } from '@shared/utils/logger';
import type { Track } from '@shared/types/track.types';
import type { RemoteTrack } from '../../types';
import styles from './SharedAlbumPage.module.css';

/**
 * SharedAlbumPage Component
 * Displays album details from a federated server
 */
export default function SharedAlbumPage() {
  const { serverId, albumId } = useParams<{ serverId: string; albumId: string }>();
  const [, setLocation] = useLocation();
  const [coverDimensions, setCoverDimensions] = useState<{ width: number; height: number } | null>(null);
  const imageLightboxModal = useModal();
  const [isImporting, setIsImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const { data: album, isLoading, error } = useRemoteAlbum(serverId, albumId);
  useDocumentTitle(album?.name);
  const dominantColor = useDominantColor(album?.coverUrl);
  const { data: servers } = useConnectedServers();
  const startImport = useStartImport();
  const { playQueue, currentTrack, isPlaying, play, pause, setShuffle } = usePlayer();

  const server = servers?.find(s => s.id === serverId);
  const coverUrl = album?.coverUrl;
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

  /**
   * Convert RemoteTrack to Track with proper stream URL for federated playback
   */
  const convertToPlayableTracks = useCallback((remoteTracks: RemoteTrack[]): Track[] => {
    if (!serverId || !album) return [];

    return remoteTracks.map((remoteTrack) => ({
      id: `${serverId}-${remoteTrack.id}`, // Unique ID for player queue
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
      coverImage: coverUrl,
      // Custom stream URL for federated tracks
      streamUrl: `${API_BASE_URL}/federation/servers/${serverId}/tracks/${remoteTrack.id}/stream`,
    }));
  }, [serverId, album, coverUrl, API_BASE_URL]);

  // Memoized playable tracks
  const playableTracks = useMemo(() => {
    if (!album?.tracks) return [];
    return convertToPlayableTracks(album.tracks);
  }, [album?.tracks, convertToPlayableTracks]);

  // Get the index of the currently playing track
  const currentPlayingIndex = useMemo(() => {
    if (!currentTrack || !album?.tracks) return -1;
    return album.tracks.findIndex(
      (track) => currentTrack.id === `${serverId}-${track.id}`
    );
  }, [currentTrack, album?.tracks, serverId]);

  /**
   * Play all tracks starting from the beginning
   */
  const handlePlayAll = useCallback(() => {
    if (playableTracks.length === 0) return;
    setShuffle(false);
    playQueue(playableTracks, 0);
  }, [playableTracks, playQueue, setShuffle]);

  /**
   * Shuffle play all tracks
   */
  const handleShufflePlay = useCallback(() => {
    if (playableTracks.length === 0) return;
    setShuffle(true);
    // Shuffle the tracks array using Fisher-Yates algorithm
    const shuffledTracks = [...playableTracks];
    for (let i = shuffledTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
    }
    playQueue(shuffledTracks, 0);
  }, [playableTracks, playQueue, setShuffle]);

  /**
   * Play a specific track
   */
  const handlePlayTrack = useCallback((index: number) => {
    if (playableTracks.length === 0 || index < 0 || index >= playableTracks.length) return;
    playQueue(playableTracks, index);
  }, [playableTracks, playQueue]);

  /**
   * Toggle play/pause for the current track
   */
  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!imageLightboxModal.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        imageLightboxModal.close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [imageLightboxModal.isOpen, imageLightboxModal.close]);

  // Load cover dimensions when modal opens
  useEffect(() => {
    if (imageLightboxModal.isOpen && coverUrl) {
      let cancelled = false;
      const img = new window.Image();
      img.onload = () => {
        if (!cancelled) {
          setCoverDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          setCoverDimensions(null);
        }
      };
      img.src = coverUrl;
      return () => {
        cancelled = true;
        img.src = '';
      };
    } else if (!imageLightboxModal.isOpen) {
      setCoverDimensions(null);
    }
  }, [imageLightboxModal.isOpen, coverUrl]);

  const handleImport = async () => {
    if (!serverId || !albumId || isImporting || isImported) return;

    setImportError(null);
    setIsImporting(true);
    try {
      await startImport.mutateAsync({ serverId, remoteAlbumId: albumId });
      setIsImported(true);
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Failed to start import:', err);
      }

      // Parse error to show user-friendly message
      let errorMessage = 'Error al importar el álbum';

      if (err instanceof AxiosError && err.response) {
        const status = err.response.status;
        const data = err.response.data as { message?: string };

        if (status === 403 && data?.message?.includes('Download permission')) {
          errorMessage = `El servidor "${server?.name || 'remoto'}" no te ha dado permiso para descargar. Pídele que active el permiso "Descargar" en su panel de federación.`;
        } else if (status === 403) {
          errorMessage = `No tienes permiso para importar desde "${server?.name || 'este servidor'}"`;
        } else if (status === 404) {
          errorMessage = 'El álbum ya no está disponible en el servidor remoto';
        } else if (data?.message) {
          errorMessage = data.message;
        }
      }

      setImportError(errorMessage);
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
                decoding="async"
                onError={handleImageError}
                onClick={imageLightboxModal.open}
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
                {/* Play button */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePlayAll}
                  leftIcon={<Play size={20} fill="currentColor" />}
                  disabled={playableTracks.length === 0}
                >
                  Reproducir
                </Button>

                {/* Shuffle button */}
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleShufflePlay}
                  leftIcon={<Shuffle size={20} />}
                  disabled={playableTracks.length === 0}
                >
                  Aleatorio
                </Button>

                {/* Options menu */}
                <div className={styles.sharedAlbumPage__optionsMenu}>
                  <button
                    ref={menuTriggerRef}
                    className={styles.sharedAlbumPage__optionsTrigger}
                    onClick={toggleMenu}
                    aria-label="Opciones del álbum"
                    aria-expanded={isMenuOpen}
                    title="Más opciones"
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
                        bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : undefined,
                        right: menuPosition.right !== undefined ? `${menuPosition.right}px` : undefined,
                        left: menuPosition.left !== undefined ? `${menuPosition.left}px` : undefined,
                        maxHeight: `${menuPosition.maxHeight}px`,
                        pointerEvents: isMenuClosing ? 'none' : 'auto',
                      }}
                      data-placement={menuPosition.placement}
                    >
                      <button
                        className={styles.sharedAlbumPage__optionsOption}
                        onClick={(e) => handleOptionClick(e, handleImport)}
                        disabled={isImporting || isImported}
                      >
                        {isImporting ? (
                          <Loader2 size={16} className={styles.sharedAlbumPage__spinner} />
                        ) : isImported ? (
                          <Check size={16} />
                        ) : (
                          <Download size={16} />
                        )}
                        <span>
                          {isImported ? 'Álbum importado' : isImporting ? 'Importando...' : 'Importar a mi servidor'}
                        </span>
                      </button>
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
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Track listing */}
          <div className={styles.sharedAlbumPage__trackSection}>
            {album.tracks && album.tracks.length > 0 ? (
              <div className={styles.sharedAlbumPage__trackList}>
                <div className={styles.sharedAlbumPage__trackHeader}>
                  <span className={styles.sharedAlbumPage__trackNumber}>#</span>
                  <span className={styles.sharedAlbumPage__trackTitle}>Titulo</span>
                  <span className={styles.sharedAlbumPage__trackDuration}>Duracion</span>
                </div>
                {album.tracks.map((track: RemoteTrack, index: number) => {
                  const isCurrentTrack = currentPlayingIndex === index;
                  const isTrackPlaying = isCurrentTrack && isPlaying;

                  return (
                    <div
                      key={track.id}
                      className={`${styles.sharedAlbumPage__trackRow} ${isCurrentTrack ? styles['sharedAlbumPage__trackRow--active'] : ''}`}
                      onClick={() => isTrackPlaying ? handleTogglePlayPause() : handlePlayTrack(index)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          isTrackPlaying ? handleTogglePlayPause() : handlePlayTrack(index);
                        }
                      }}
                    >
                      <span className={styles.sharedAlbumPage__trackNumber}>
                        {isTrackPlaying ? (
                          <Pause size={14} className={styles.sharedAlbumPage__trackPlayIcon} />
                        ) : isCurrentTrack ? (
                          <Play size={14} className={styles.sharedAlbumPage__trackPlayIcon} />
                        ) : (
                          <span className={styles.sharedAlbumPage__trackNumberText}>
                            {track.trackNumber || index + 1}
                          </span>
                        )}
                        <Play size={14} className={styles.sharedAlbumPage__trackPlayIconHover} />
                      </span>
                      <div className={styles.sharedAlbumPage__trackInfo}>
                        <span className={`${styles.sharedAlbumPage__trackName} ${isCurrentTrack ? styles['sharedAlbumPage__trackName--active'] : ''}`}>
                          {track.title}
                        </span>
                        <span className={styles.sharedAlbumPage__trackArtist}>{track.artistName}</span>
                      </div>
                      <span className={styles.sharedAlbumPage__trackDuration}>
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
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
      {imageLightboxModal.isOpen && coverUrl && (
        <div
          className={styles.sharedAlbumPage__imageModal}
          onClick={imageLightboxModal.close}
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
