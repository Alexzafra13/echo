import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Music,
  Radio,
  Maximize2,
  Film,
} from 'lucide-react';
import { usePlayback } from '../../context/PlaybackContext';
import { useQueue } from '../../context/QueueContext';
import { useRadio } from '../../context/RadioContext';
import { useCurrentTime } from '../../store/timeStore';
import { QueueList } from '../QueueList/QueueList';
import { PlayerMenu } from '../PlayerMenu/PlayerMenu';
import { NowPlayingView } from '../NowPlayingView';
import { usePlayerSettingsStore } from '../../store';
import { useClickOutsideRef } from '../../hooks/useClickOutsideRef';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { usePlayerVisibility } from '../../hooks/usePlayerVisibility';
import { usePlayerDominantColor } from '../../hooks/usePlayerDominantColor';
import { getPlayerDisplayInfo } from '../../utils/player.utils';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { ProgressBar } from './ProgressBar';
import { VideoPlayer } from '@features/music-videos';
import { useStreamToken } from '../../hooks/useStreamToken';
import { DEFAULT_VOLUME } from '../../types';
import styles from './AudioPlayer.module.css';

interface AudioPlayerProps {
  /** Slot for external status indicators (e.g. listening session) */
  statusSlot?: React.ReactNode;
}

export function AudioPlayer({ statusSlot }: AudioPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    volume,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    setVolume,
    pause,
  } = usePlayback();
  const { queue, isShuffle, repeatMode, toggleShuffle, toggleRepeat } = useQueue();
  const { currentRadioStation, isRadioMode, radioMetadata, radioSignalStatus } = useRadio();
  const { currentTime, duration } = useCurrentTime();
  const { t } = useTranslation();

  const [, setLocation] = useLocation();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { ensureToken } = useStreamToken();
  const preference = usePlayerSettingsStore((s) => s.playerPreference);

  // ========== HOOKS EXTRAIDOS ==========

  const video = useVideoPlayer({
    currentTrack,
    isPlaying,
    volume,
    pause,
    togglePlayPause,
    setVolume,
    ensureToken,
  });

  const { isMobile, shouldHide } = usePlayerVisibility({
    hasContent: !!(currentTrack || currentRadioStation),
    isNowPlayingOpen,
    preference,
  });

  const swipe = useSwipeNavigation({
    isMobile,
    isRadioMode,
    playNext,
    playPrevious,
  });

  const dominantColor = usePlayerDominantColor({
    isRadioMode,
    currentRadioStation,
    currentTrack,
  });

  // ========== UI HANDLERS ==========

  useClickOutsideRef(queueRef, () => setIsQueueOpen(false), isQueueOpen);
  useClickOutsideRef(menuRef, () => setIsMenuOpen(false), isMenuOpen);

  if (!currentTrack && !currentRadioStation) {
    return null;
  }

  const toggleMute = () => {
    setVolume(volume === 0 ? DEFAULT_VOLUME : 0);
  };

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
  };

  const { title, artist, cover, albumId, albumName, artistId } = getPlayerDisplayInfo(
    isRadioMode,
    currentRadioStation,
    currentTrack
  );

  const handleGoToAlbum = () => {
    if (!isRadioMode && albumId) {
      setLocation(`/album/${albumId}`);
    }
  };

  const handleGoToArtist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRadioMode && artistId) {
      setLocation(`/artists/${artistId}`);
    }
  };

  const canNavigateToAlbum = !isRadioMode && albumId;
  const canNavigateToArtist = !isRadioMode && artistId;

  const handleTrackInfoClick = () => {
    if (isMobile) {
      setIsNowPlayingOpen(true);
    }
  };

  return (
    <div
      className={`${styles.player} ${shouldHide ? styles['player--hidden'] : ''}`}
      style={{ '--player-color': dominantColor } as React.CSSProperties}
      role="region"
      aria-label={t('player.audioPlayer')}
      onTouchStart={swipe.handleTouchStart}
      onTouchMove={swipe.handleTouchMove}
      onTouchEnd={swipe.handleTouchEnd}
    >
      <div
        className={`${styles.trackInfo} ${isMobile ? styles['trackInfo--clickable'] : ''}`}
        onClick={handleTrackInfoClick}
      >
        {video.isVideoOpen && video.videoStreamUrl ? (
          <div
            className={styles.videoInline}
            onClick={(e) => {
              e.stopPropagation();
              video.setIsVideoFullscreen(true);
            }}
            title={t('player.expandVideo')}
          >
            <video
              ref={video.videoRef}
              src={video.videoStreamUrl}
              className={styles.videoInlinePlayer}
              autoPlay
              playsInline
              onPlay={() => video.setIsVideoPlaying(true)}
              onPause={() => video.setIsVideoPlaying(false)}
              onTimeUpdate={() => {
                if (video.videoRef.current)
                  video.setVideoCurrentTime(video.videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (video.videoRef.current) {
                  video.setVideoDuration(video.videoRef.current.duration);
                  video.videoRef.current.volume = volume;
                }
              }}
            />
          </div>
        ) : (
          <div
            className={`${styles.trackCoverContainer} ${canNavigateToAlbum && !isMobile ? styles['trackCoverContainer--clickable'] : ''}`}
            onClick={canNavigateToAlbum && !isMobile ? handleGoToAlbum : undefined}
            title={
              canNavigateToAlbum && !isMobile
                ? t('player.goToAlbum', { name: albumName || title })
                : undefined
            }
            style={swipe.coverSwipeStyles}
          >
            {isRadioMode && (
              <div className={styles.trackCoverFallback}>
                <Radio size={24} />
              </div>
            )}
            <img
              src={isRadioMode ? cover : getCoverUrl(cover)}
              alt={title}
              className={styles.trackCover}
              onError={handleImageError}
            />
          </div>
        )}
        <div className={styles.trackDetails} style={swipe.textSwipeStyles}>
          <div className={styles.trackTitle}>{title}</div>
          <div
            className={`${styles.trackArtist} ${canNavigateToArtist && !isMobile ? styles['trackArtist--clickable'] : ''}`}
            onClick={canNavigateToArtist && !isMobile ? handleGoToArtist : undefined}
          >
            {artist}
          </div>
          {canNavigateToAlbum && albumName && <div className={styles.trackAlbum}>{albumName}</div>}
          {isRadioMode && radioMetadata && (
            <div className={styles.trackMetadata}>
              {radioMetadata.title ||
                `${radioMetadata.artist || ''} - ${radioMetadata.song || ''}`.trim()}
            </div>
          )}
        </div>
      </div>

      <div className={styles.playerControls}>
        <div className={styles.controlButtons}>
          {isRadioMode ? (
            <button
              className={`${styles.controlButton} ${styles.playButton}`}
              onClick={togglePlayPause}
              aria-label={isPlaying ? t('player.pause') : t('player.play')}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
          ) : (
            <>
              <button
                className={`${styles.controlButton} ${styles.controlButtonSmall} ${isShuffle ? styles.active : ''}`}
                onClick={toggleShuffle}
                aria-label={isShuffle ? t('player.disableShuffle') : t('player.enableShuffle')}
                aria-pressed={isShuffle}
              >
                <Shuffle size={16} />
              </button>

              <button
                className={styles.controlButton}
                onClick={playPrevious}
                aria-label={t('player.previous')}
              >
                <SkipBack size={20} />
              </button>

              <button
                className={`${styles.controlButton} ${styles.playButton}`}
                onClick={() => {
                  if (!video.handleVideoPlayPause()) togglePlayPause();
                }}
                aria-label={
                  (video.isVideoOpen ? video.isVideoPlaying : isPlaying)
                    ? t('player.pause')
                    : t('player.play')
                }
              >
                {(video.isVideoOpen ? video.isVideoPlaying : isPlaying) ? (
                  <Pause size={24} />
                ) : (
                  <Play size={24} />
                )}
              </button>

              <button
                className={styles.controlButton}
                onClick={playNext}
                aria-label={t('player.next')}
              >
                <SkipForward size={20} />
              </button>

              <button
                className={`${styles.controlButton} ${styles.controlButtonSmall} ${repeatMode !== 'off' ? styles.active : ''}`}
                onClick={toggleRepeat}
                aria-label={t('player.repeatStatus', {
                  status:
                    repeatMode === 'off'
                      ? t('player.repeatStatusOff')
                      : repeatMode === 'one'
                        ? t('player.repeatStatusOne')
                        : t('player.repeatStatusAll'),
                })}
                aria-pressed={repeatMode !== 'off'}
              >
                {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.volumeControl}>
        {isRadioMode && (
          <div
            className={`${styles.liveIndicator} ${
              radioSignalStatus === 'good'
                ? styles['liveIndicator--good']
                : radioSignalStatus === 'weak'
                  ? styles['liveIndicator--weak']
                  : radioSignalStatus === 'error'
                    ? styles['liveIndicator--error']
                    : ''
            }`}
          >
            <Radio size={16} className={styles.liveAntenna} />
            <span className={styles.liveText}>
              {radioSignalStatus === 'good'
                ? t('player.live')
                : radioSignalStatus === 'weak'
                  ? t('player.weakSignal')
                  : radioSignalStatus === 'error'
                    ? t('player.noSignal')
                    : t('player.live')}
            </span>
          </div>
        )}

        {!isRadioMode && (
          <div className={styles.queueContainer} ref={queueRef}>
            <button
              className={`${styles.queueButton} ${isQueueOpen ? styles['queueButton--active'] : ''}`}
              onClick={toggleQueue}
              title={t('player.playQueue')}
            >
              <ListMusic size={22} strokeWidth={1.5} />
              {queue.length > 0 && (
                <span className={styles.queueButton__count}>{queue.length}</span>
              )}
            </button>

            {isQueueOpen && <QueueList onClose={() => setIsQueueOpen(false)} />}
          </div>
        )}

        {statusSlot}

        <div className={styles.volumeContainer}>
          <button
            className={styles.volumeButton}
            onClick={toggleMute}
            aria-label={volume === 0 ? t('player.unmute') : t('player.mute')}
          >
            {volume === 0 ? (
              <VolumeX size={22} strokeWidth={1.5} />
            ) : (
              <Volume2 size={22} strokeWidth={1.5} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={video.handleVolumeChangeWithVideo}
            className={styles.volumeSlider}
            aria-label={t('player.volume')}
            aria-valuetext={`${Math.round(volume * 100)}%`}
            style={{ '--volume-percent': `${volume * 100}%` } as React.CSSProperties}
          />
        </div>

        {!isMobile && currentTrack?.videoId && (
          <button
            className={`${styles.videoButton} ${video.isVideoOpen ? styles.videoButtonActive : ''}`}
            onClick={video.isVideoOpen ? video.handleCloseVideo : video.handleOpenVideo}
            aria-label={video.isVideoOpen ? t('player.backToAudio') : t('player.watchVideo')}
            title={video.isVideoOpen ? t('player.backToAudio') : t('player.watchVideo')}
          >
            {video.isVideoOpen ? (
              <Music size={20} strokeWidth={1.5} />
            ) : (
              <Film size={20} strokeWidth={1.5} />
            )}
          </button>
        )}

        {!isMobile && (
          <button
            className={styles.expandButton}
            onClick={() => setIsNowPlayingOpen(true)}
            aria-label={t('player.expandPlayer')}
          >
            <Maximize2 size={22} strokeWidth={1.5} />
          </button>
        )}

        <PlayerMenu
          isOpen={isMenuOpen}
          onToggle={() => setIsMenuOpen(!isMenuOpen)}
          onClose={() => setIsMenuOpen(false)}
          menuRef={menuRef}
          size={22}
          strokeWidth={1.5}
        />
      </div>

      {!isRadioMode && (
        <ProgressBar
          currentTime={video.isVideoOpen ? video.videoCurrentTime : currentTime}
          duration={video.isVideoOpen ? video.videoDuration : duration}
          onSeek={video.isVideoOpen ? video.handleVideoSeek : seek}
        />
      )}

      <NowPlayingView
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        dominantColor={dominantColor}
      />

      {video.isVideoFullscreen &&
        video.videoStreamUrl &&
        createPortal(
          <VideoPlayer
            streamUrl={video.videoStreamUrl}
            title={currentTrack?.title}
            artistName={currentTrack?.artistName || currentTrack?.artist}
            onClose={() => video.setIsVideoFullscreen(false)}
          />,
          document.body
        )}
    </div>
  );
}
