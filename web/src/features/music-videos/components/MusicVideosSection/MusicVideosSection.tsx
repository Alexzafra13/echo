import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, Play, Monitor } from 'lucide-react';
import { useStreamToken } from '@features/player';
import { VideoPlayer } from '../VideoPlayer/VideoPlayer';
import { musicVideosService, type MusicVideo } from '../../services/music-videos.service';
import { formatDuration } from '@shared/types/track.types';
import styles from './MusicVideosSection.module.css';

interface MusicVideosSectionProps {
  videos: MusicVideo[];
}

export const MusicVideosSection = memo(function MusicVideosSection({
  videos,
}: MusicVideosSectionProps) {
  const { t } = useTranslation();
  const [activeVideo, setActiveVideo] = useState<MusicVideo | null>(null);
  const { ensureToken } = useStreamToken();

  const handlePlayVideo = useCallback(
    async (video: MusicVideo) => {
      const token = await ensureToken();
      if (!token) return;
      setActiveVideo(video);
    },
    [ensureToken]
  );

  const handleClose = useCallback(() => {
    setActiveVideo(null);
  }, []);

  if (videos.length === 0) return null;

  return (
    <>
      <section className={styles.section}>
        <div className={styles.header}>
          <Film size={24} className={styles.icon} />
          <h2 className={styles.title}>{t('musicVideos.sectionTitle')}</h2>
        </div>

        <div className={styles.grid}>
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onPlay={handlePlayVideo} />
          ))}
        </div>
      </section>

      {activeVideo && <VideoPlayerWithToken video={activeVideo} onClose={handleClose} />}
    </>
  );
});

/**
 * Individual video card with hover preview
 */
function VideoCard({ video, onPlay }: { video: MusicVideo; onPlay: (v: MusicVideo) => void }) {
  const { t } = useTranslation();
  const previewRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { ensureToken } = useStreamToken();

  // Pre-fetch the stream URL on mount so hover is instant
  useEffect(() => {
    let cancelled = false;
    const hoverTimer = hoverTimerRef.current;
    const preview = previewRef.current;
    ensureToken().then((token) => {
      if (!cancelled && token) {
        setPreviewUrl(musicVideosService.getStreamUrl(video.id, token));
      }
    });
    return () => {
      cancelled = true;
      if (hoverTimer) clearTimeout(hoverTimer);
      if (preview) {
        preview.pause();
      }
    };
  }, [video.id, ensureToken]);

  const handleMouseEnter = useCallback(() => {
    if (!previewUrl) return;
    hoverTimerRef.current = setTimeout(() => {
      const vid = previewRef.current;
      if (!vid) return;
      vid.src = previewUrl;
      vid.muted = true;
      vid
        .play()
        .then(() => setPreviewing(true))
        .catch(() => {});
    }, 150);
  }, [previewUrl]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const vid = previewRef.current;
    if (vid) {
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    }
    setPreviewing(false);
  }, []);

  return (
    <button
      className={styles.card}
      onClick={() => onPlay(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.thumbnail}>
        {/* Thumbnail image */}
        {video.thumbnailUrl && (
          <img
            src={video.thumbnailUrl}
            alt={video.title || 'Video'}
            className={`${styles.thumbnailImg} ${previewing ? styles.thumbnailHidden : ''}`}
            loading="lazy"
            decoding="async"
          />
        )}
        {!video.thumbnailUrl && (
          <div
            className={`${styles.thumbnailPlaceholder} ${previewing ? styles.thumbnailHidden : ''}`}
          >
            <Film size={36} />
          </div>
        )}

        {/* Preview video (hidden until hover) */}
        <video
          ref={previewRef}
          className={`${styles.previewVideo} ${previewing ? styles.previewVisible : ''}`}
          muted
          playsInline
          loop
        />

        {/* Play button - hidden during preview */}
        {!previewing && (
          <div className={styles.playBtn}>
            <Play size={24} fill="white" stroke="white" />
          </div>
        )}

        {/* Duration badge */}
        {video.duration != null && video.duration > 0 && (
          <span className={styles.durationBadge}>{formatDuration(video.duration)}</span>
        )}

        {/* Quality badge */}
        {video.height != null && video.height > 0 && (
          <span className={styles.qualityBadge}>
            {video.height >= 2160
              ? '4K'
              : video.height >= 1080
                ? '1080p'
                : video.height >= 720
                  ? '720p'
                  : `${video.height}p`}
          </span>
        )}
      </div>

      {/* Info below thumbnail */}
      <div className={styles.info}>
        <span className={styles.videoTitle}>{video.title || t('musicVideos.fallbackTitle')}</span>
        <div className={styles.videoMeta}>
          {video.suffix && <span>{video.suffix.toUpperCase()}</span>}
          {video.width && video.height && (
            <span>
              <Monitor size={11} />
              {video.width}x{video.height}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function VideoPlayerWithToken({ video, onClose }: { video: MusicVideo; onClose: () => void }) {
  const { ensureToken } = useStreamToken();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureToken().then((token) => {
      if (!cancelled && token) {
        setStreamUrl(musicVideosService.getStreamUrl(video.id, token));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [video.id, ensureToken]);

  if (!streamUrl) return null;

  return (
    <VideoPlayer
      streamUrl={streamUrl}
      title={video.title || undefined}
      artistName={video.artistName || undefined}
      onClose={onClose}
    />
  );
}
