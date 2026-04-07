import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { usePlayback } from '../../context/PlaybackContext';
import { useQueue } from '../../context/QueueContext';
import { useRadio } from '../../context/RadioContext';
import { useCurrentTime } from '../../store/timeStore';
import { getPlayerDisplayInfo } from '../../utils/player.utils';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { useStreamToken } from '../../hooks/useStreamToken';
import { VideoPlayer } from '@features/music-videos';
import { DEFAULT_VOLUME } from '../../types';
import { useScrollLock, useIsMobile } from '@shared/hooks';
import { useSwipeToClose } from './hooks';
import {
  NowPlayingHeader,
  NowPlayingCover,
  NowPlayingInfo,
  ProgressBar,
  PlaybackControls,
  VolumeControl,
  MobileActions,
  QueuePanel,
  BeamsBackground,
} from './components';
import styles from './NowPlayingView.module.css';

interface NowPlayingViewProps {
  isOpen: boolean;
  onClose: () => void;
  dominantColor: string;
}

export function NowPlayingView({ isOpen, onClose, dominantColor }: NowPlayingViewProps) {
  const [, setLocation] = useLocation();
  const {
    currentTrack,
    isPlaying,
    volume,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    setVolume,
  } = usePlayback();
  const { queue, isShuffle, repeatMode, toggleShuffle, toggleRepeat } = useQueue();
  const { currentRadioStation, isRadioMode } = useRadio();
  const { currentTime, duration } = useCurrentTime();

  const { ensureToken } = useStreamToken();
  const video = useVideoPlayer({
    currentTrack,
    isPlaying,
    volume,
    pause: () => {
      if (isPlaying) togglePlayPause();
    },
    togglePlayPause,
    setVolume,
    ensureToken,
  });

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isQueueClosing, setIsQueueClosing] = useState(false);
  const [queueState, setQueueState] = useState<'half' | 'full'>('half');
  const [queueDragOffset, setQueueDragOffset] = useState(0);
  const queueRef = useRef<HTMLDivElement>(null);
  const queueContentRef = useRef<HTMLDivElement>(null);
  const isQueueDragging = useRef(false);
  const queueTouchStartY = useRef<number>(0);
  const queueStateRef = useRef(queueState);
  const queueDragOffsetRef = useRef(queueDragOffset);
  const queueCloseTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const navTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      clearTimeout(queueCloseTimerRef.current);
      clearTimeout(navTimerRef.current);
    },
    []
  );

  const isDesktop = !useIsMobile();

  const { dragOffset, handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeToClose({
    enabled: isOpen && !isQueueOpen,
    onClose,
  });

  const handleGoToAlbum = useCallback(
    (e: React.MouseEvent, albumId: string) => {
      e.stopPropagation();
      if (!isRadioMode) {
        onClose();
        navTimerRef.current = setTimeout(() => setLocation(`/album/${albumId}`), 50);
      }
    },
    [isRadioMode, onClose, setLocation]
  );

  const handleGoToArtist = useCallback(
    (e: React.MouseEvent, artistId: string) => {
      e.stopPropagation();
      if (!isRadioMode) {
        onClose();
        navTimerRef.current = setTimeout(() => setLocation(`/artists/${artistId}`), 50);
      }
    },
    [isRadioMode, onClose, setLocation]
  );

  const handleToggleMute = useCallback(() => {
    setVolume(volume === 0 ? DEFAULT_VOLUME : 0);
  }, [volume, setVolume]);

  const handleToggleQueue = useCallback(() => {
    if (isQueueOpen) {
      if (isDesktop) {
        setIsQueueClosing(true);
        clearTimeout(queueCloseTimerRef.current);
        queueCloseTimerRef.current = setTimeout(() => {
          setIsQueueOpen(false);
          setIsQueueClosing(false);
        }, 300);
      } else {
        setIsQueueOpen(false);
      }
    } else {
      setIsQueueOpen(true);
    }
  }, [isQueueOpen, isDesktop]);

  const handleCloseQueue = useCallback(() => {
    if (isDesktop) {
      setIsQueueClosing(true);
      clearTimeout(queueCloseTimerRef.current);
      queueCloseTimerRef.current = setTimeout(() => {
        setIsQueueOpen(false);
        setIsQueueClosing(false);
      }, 300);
    } else {
      setIsQueueOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (isOpen && isDesktop && !isRadioMode) {
      setIsQueueOpen(true);
    }
  }, [isOpen, isDesktop, isRadioMode]);

  useEffect(() => {
    if (!isOpen) {
      setIsQueueOpen(false);
      setIsQueueClosing(false);
      setQueueState('half');
      setQueueDragOffset(0);
    }
  }, [isOpen]);

  useScrollLock(isOpen);

  // Queue panel gesture handling (mobile)
  useEffect(() => {
    queueStateRef.current = queueState;
  }, [queueState]);

  useEffect(() => {
    queueDragOffsetRef.current = queueDragOffset;
  }, [queueDragOffset]);

  useEffect(() => {
    const queueElement = queueRef.current;
    if (!queueElement || isDesktop) return;

    const handleQueueTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
      queueTouchStartY.current = e.touches[0].clientY;
      isQueueDragging.current = false;
    };

    const handleQueueTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
      const deltaY = e.touches[0].clientY - queueTouchStartY.current;
      const scrollTop = queueContentRef.current?.scrollTop || 0;
      const isAtTop = scrollTop <= 0;
      const currentQueueState = queueStateRef.current;

      if (deltaY > 0) {
        if ((currentQueueState === 'full' || currentQueueState === 'half') && isAtTop) {
          isQueueDragging.current = true;
          setQueueDragOffset(deltaY);
          e.preventDefault();
        }
      } else if (deltaY < 0) {
        if (currentQueueState === 'half') {
          isQueueDragging.current = true;
          setQueueDragOffset(deltaY);
          e.preventDefault();
        }
      }
    };

    const handleQueueTouchEnd = () => {
      const currentOffset = queueDragOffsetRef.current;
      const currentQueueState = queueStateRef.current;

      if (currentOffset > 100) {
        if (currentQueueState === 'full') {
          setQueueState('half');
        } else {
          setIsQueueOpen(false);
          setQueueState('half');
        }
      } else if (currentOffset < -50) {
        setQueueState('full');
      }
      setQueueDragOffset(0);
      isQueueDragging.current = false;
    };

    queueElement.addEventListener('touchstart', handleQueueTouchStart, { passive: true });
    queueElement.addEventListener('touchmove', handleQueueTouchMove, { passive: false });
    queueElement.addEventListener('touchend', handleQueueTouchEnd, { passive: true });

    return () => {
      queueElement.removeEventListener('touchstart', handleQueueTouchStart);
      queueElement.removeEventListener('touchmove', handleQueueTouchMove);
      queueElement.removeEventListener('touchend', handleQueueTouchEnd);
    };
  }, [isDesktop, isQueueOpen]);

  // Get display info
  const { title, artist, cover, albumName, artistId, albumId } = getPlayerDisplayInfo(
    isRadioMode,
    currentRadioStation,
    currentTrack
  );

  // Calculate styles for drag interaction
  const dragStyles: React.CSSProperties = {
    '--dominant-color': dominantColor,
  } as React.CSSProperties;

  if (isOpen && dragOffset > 0) {
    dragStyles.transform = `translateY(${dragOffset}px)`;
    dragStyles.transition = 'none';
  }

  return createPortal(
    <div
      className={`${styles.nowPlaying} ${isOpen ? styles['nowPlaying--open'] : ''} ${isDesktop && isQueueOpen && !isQueueClosing ? styles['nowPlaying--withQueue'] : ''}`}
      style={dragStyles}
      onTouchStart={isOpen ? handleTouchStart : undefined}
      onTouchMove={isOpen ? handleTouchMove : undefined}
      onTouchEnd={isOpen ? handleTouchEnd : undefined}
    >
      {/* Background gradient */}
      <div className={styles.nowPlaying__background} />

      {/* Animated color effect - beams on desktop, subtle pulses on mobile */}
      {isOpen && <BeamsBackground dominantColor={dominantColor} intensity="medium" />}

      {/* Header */}
      <NowPlayingHeader albumName={albumName} onClose={onClose} dominantColor={dominantColor} />

      {/* Cover */}
      <NowPlayingCover
        cover={cover}
        title={title}
        albumName={albumName}
        albumId={albumId}
        isRadioMode={isRadioMode}
        onGoToAlbum={handleGoToAlbum}
      />

      {/* Track Info */}
      <NowPlayingInfo
        title={title}
        artist={artist}
        artistId={artistId}
        isRadioMode={isRadioMode}
        onGoToArtist={handleGoToArtist}
      />

      {/* Progress Bar */}
      {!isRadioMode && <ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />}

      {/* Controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isRadioMode={isRadioMode}
        onTogglePlayPause={togglePlayPause}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onToggleShuffle={toggleShuffle}
        onToggleRepeat={toggleRepeat}
      />

      {/* Volume Control (Desktop) */}
      {isDesktop && (
        <VolumeControl
          volume={volume}
          queueLength={queue.length}
          isQueueOpen={isQueueOpen && !isQueueClosing}
          isRadioMode={isRadioMode}
          onVolumeChange={setVolume}
          onToggleMute={handleToggleMute}
          onToggleQueue={handleToggleQueue}
        />
      )}

      {/* Mobile Actions */}
      {!isRadioMode && !isDesktop && (
        <MobileActions
          queueLength={queue.length}
          isQueueOpen={isQueueOpen && !isQueueClosing}
          onToggleQueue={handleToggleQueue}
          hasVideo={!!currentTrack?.videoId}
          onPlayVideo={video.handleOpenVideo}
        />
      )}

      {/* Queue Panel */}
      {(isQueueOpen || isQueueClosing) && (
        <QueuePanel
          ref={queueRef}
          isDesktop={isDesktop}
          queueState={queueState}
          isClosing={isQueueClosing}
          dragOffset={queueDragOffset}
          isDragging={isQueueDragging.current}
          onClose={handleCloseQueue}
          contentRef={queueContentRef}
        />
      )}

      {/* Drag indicator */}
      <div className={styles.nowPlaying__dragIndicator} />

      {/* Video fullscreen overlay */}
      {video.isVideoFullscreen && video.videoStreamUrl && (
        <VideoPlayer
          streamUrl={video.videoStreamUrl}
          title={currentTrack?.title}
          artistName={currentTrack?.artistName || currentTrack?.artist}
          onClose={video.handleCloseVideo}
        />
      )}
    </div>,
    document.body
  );
}
