import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { useQueue, useStreamToken } from '@features/player';
import { musicVideosService } from '@features/music-videos';
import { apiClient } from '@shared/services/api';
import type { Track } from '@shared/types/track.types';
import {
  useArtistImages,
  getArtistImageUrl,
  useAutoEnrichArtist,
  useAlbumTracks,
} from '../../hooks';
import { useArtistMetadataSync, useAlbumMetadataSync } from '@shared/hooks';
import { useArtist } from '@features/artists/hooks';
import type { HeroSectionProps } from '../../types';
import { isHeroAlbum, isHeroPlaylist, isHeroMusicVideo } from '../../types';
import { logger } from '@shared/utils/logger';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import styles from './HeroSection.module.css';

export function HeroSection({ item, onPlay, onNext, onPrevious }: HeroSectionProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { playQueue } = useQueue();

  const isAlbum = isHeroAlbum(item);
  const isPlaylist = isHeroPlaylist(item);
  const isMusicVideo = isHeroMusicVideo(item);

  const album = isAlbum ? item.data : null;
  const playlist = isPlaylist ? item.data : null;
  const musicVideo = isMusicVideo ? item.data : null;

  const artistId = isAlbum
    ? (album?.artistId ?? '')
    : isPlaylist
      ? playlist?.metadata.artistId || ''
      : musicVideo?.artistId || '';

  useArtistMetadataSync(artistId);
  useAlbumMetadataSync(isAlbum ? (album?.id ?? '') : '', artistId);

  const { data: artist } = useArtist(artistId);
  const { data: artistImages } = useArtistImages(artistId);
  const { data: albumTracks } = useAlbumTracks(isAlbum ? (album?.id ?? '') : '');

  // Stream token for music video playback
  const { data: tokenData, ensureToken } = useStreamToken();
  const [videoError, setVideoError] = useState(false);
  const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoIdRef = useRef<string | null>(null);

  // Fetch track data for music-video hero items (to get albumId for cover)
  const [musicVideoTrack, setMusicVideoTrack] = useState<Track | null>(null);
  useEffect(() => {
    if (!isMusicVideo || !musicVideo?.trackId) {
      setMusicVideoTrack(null);
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/tracks/${musicVideo.trackId}`)
      .then(({ data }) => {
        if (!cancelled && data) setMusicVideoTrack(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isMusicVideo, musicVideo?.trackId]);

  useEffect(() => {
    if (!isMusicVideo || !musicVideo) {
      setVideoStreamUrl(null);
      videoIdRef.current = null;
      return;
    }
    // Skip if already resolved for this video
    if (videoIdRef.current === musicVideo.id && videoStreamUrl) return;
    videoIdRef.current = musicVideo.id;
    setVideoError(false);

    // Try sync token first, then async
    if (tokenData?.token) {
      setVideoStreamUrl(musicVideosService.getStreamUrl(musicVideo.id, tokenData.token));
    } else {
      let cancelled = false;
      ensureToken().then((token) => {
        if (!cancelled && token) {
          setVideoStreamUrl(musicVideosService.getStreamUrl(musicVideo.id, token));
        }
      });
      return () => {
        cancelled = true;
      };
    }
  }, [isMusicVideo, musicVideo?.id, tokenData?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVideoError = useCallback(() => {
    setVideoError(true);
  }, []);

  const hasHeroImages =
    artistImages?.images.background?.exists || artistImages?.images.logo?.exists;
  useAutoEnrichArtist(artistId, hasHeroImages);

  const convertAlbumToPlayerTracks = (apiTracks: Track[]): Track[] => {
    if (!album) return [];
    return apiTracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artistName || album.artist || 'Unknown Artist',
      albumId: album.id,
      albumName: album.title,
      duration: track.duration || 0,
      coverImage: album.coverImage,
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
    }));
  };

  const convertPlaylistToPlayerTracks = (): Track[] => {
    if (!playlist || !playlist.tracks) return [];
    return playlist.tracks
      .filter((st): st is typeof st & { track: NonNullable<typeof st.track> } => !!st.track)
      .map((st) => ({
        id: st.track.id,
        title: st.track.title,
        artist: st.track.artistName || 'Unknown Artist',
        albumId: st.track.albumId,
        albumName: st.track.albumName,
        duration: st.track.duration || 0,
        coverImage: st.track.albumId ? `/api/albums/${st.track.albumId}/cover` : undefined,
        rgTrackGain: st.track.rgTrackGain,
        rgTrackPeak: st.track.rgTrackPeak,
      }));
  };

  const handlePlay = async () => {
    onPlay?.();

    if (isAlbum && albumTracks && albumTracks.length > 0) {
      const playerTracks = convertAlbumToPlayerTracks(albumTracks);
      playQueue(playerTracks, 0, 'album');
      logger.debug('Playing album:', album?.title, 'with', albumTracks.length, 'tracks');
    } else if (isPlaylist && playlist?.tracks && playlist.tracks.length > 0) {
      const playerTracks = convertPlaylistToPlayerTracks();
      playQueue(playerTracks, 0, 'playlist');
      logger.debug('Playing playlist:', playlist.name, 'with', playlist.tracks.length, 'tracks');
    } else if (isMusicVideo && musicVideo?.trackId) {
      try {
        const track =
          musicVideoTrack ?? (await apiClient.get(`/tracks/${musicVideo.trackId}`)).data;
        if (track) {
          const playerTrack: Track = {
            id: track.id,
            title: track.title,
            artist: track.artistName || musicVideo.artistName || 'Unknown Artist',
            albumId: track.albumId,
            albumName: track.albumName,
            duration: track.duration || 0,
            coverImage: track.albumId ? `/api/albums/${track.albumId}/cover` : undefined,
            rgTrackGain: track.rgTrackGain,
            rgTrackPeak: track.rgTrackPeak,
            videoId: musicVideo.id,
          };
          playQueue([playerTrack], 0, 'album');
          logger.debug('Playing music video track:', track.title);
        }
      } catch {
        logger.warn('Failed to load track for music video:', musicVideo.id);
      }
    } else {
      logger.warn('No tracks available for:', album?.id ?? playlist?.id ?? musicVideo?.id);
    }
  };

  const handleNext = () => {
    onNext?.();
  };

  const handlePrevious = () => {
    onPrevious?.();
  };

  const handleCoverClick = () => {
    if (isAlbum && album) {
      setLocation(`/album/${album.id}`);
    } else if (isPlaylist && playlist) {
      safeSessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
      safeSessionStorage.setItem('playlistReturnPath', '/');
      setLocation(`/wave-mix/${playlist.id}`);
    } else if (isMusicVideo && artistId) {
      setLocation(`/artists/${artistId}`);
    }
  };

  const handleArtistClick = () => {
    if (artistId) {
      setLocation(`/artists/${artistId}`);
    }
  };

  const coverUrl = isAlbum
    ? getCoverUrl(album?.coverImage)
    : isPlaylist
      ? playlist?.coverImageUrl || ''
      : musicVideoTrack?.albumId
        ? `/api/albums/${musicVideoTrack.albumId}/cover`
        : musicVideo?.thumbnailUrl || '';

  const artistTimestamp = artist?.externalInfoUpdatedAt || artist?.updatedAt;

  const hasBackground = artistImages?.images.background?.exists;
  const backgroundUrl = hasBackground
    ? getArtistImageUrl(artistId, 'background', artistTimestamp)
    : isAlbum
      ? album?.backgroundImage || coverUrl
      : coverUrl;

  const hasLogo = artistImages?.images.logo?.exists;
  const logoUrl = hasLogo ? getArtistImageUrl(artistId, 'logo', artistTimestamp) : null;

  const playlistTitle =
    playlist?.type === 'artist'
      ? t('recommendations.bestOf', {
          name: playlist?.metadata.artistName || (playlist?.name ?? ''),
        })
      : (playlist?.name ?? '');
  const title = isAlbum
    ? (album?.title ?? '')
    : isPlaylist
      ? playlistTitle
      : musicVideo?.title || '';
  const artistName = isAlbum
    ? (album?.artist ?? '')
    : isPlaylist
      ? playlist?.metadata.artistName || ''
      : musicVideo?.artistName || '';
  const subtitle = isAlbum
    ? `${album?.year || ''}${album?.totalTracks ? `${album?.year ? ' • ' : ''}${album.totalTracks} ${t('trackInfo.songs')}` : ''}`
    : isMusicVideo
      ? t('musicVideos.sectionTitle', 'Music Video')
      : '';
  const ariaLabelCover = isAlbum
    ? `View ${title} album`
    : isPlaylist
      ? `View ${title} playlist`
      : `View ${artistName} artist page`;
  const ariaLabelArtist = `View ${artistName} artist page`;

  // Determine whether to show video background
  const showVideoBackground = isMusicVideo && videoStreamUrl && !videoError;

  return (
    <section className={styles.heroSection}>
      {/* Video background for music videos */}
      {showVideoBackground ? (
        <>
          <video
            ref={videoRef}
            className={styles.heroSection__videoBackground}
            src={videoStreamUrl}
            autoPlay
            muted
            loop
            playsInline
            onError={handleVideoError}
          />
          <div className={styles.heroSection__videoOverlay} />
        </>
      ) : (
        <div
          key={backgroundUrl}
          className={styles.heroSection__background}
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundPosition: hasBackground
              ? artist?.backgroundPosition || 'center top'
              : 'center center',
          }}
        />
      )}

      <button
        className={styles.heroSection__navButton}
        onClick={handlePrevious}
        aria-label="Previous featured item"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        className={`${styles.heroSection__navButton} ${styles['heroSection__navButton--next']}`}
        onClick={handleNext}
        aria-label="Next featured item"
      >
        <ChevronRight size={24} />
      </button>

      <div className={styles.heroSection__content}>
        <button
          onClick={handleCoverClick}
          className={styles.heroSection__albumCoverButton}
          aria-label={ariaLabelCover}
        >
          <img
            src={coverUrl}
            alt={title}
            className={styles.heroSection__albumCover}
            onError={handleImageError}
          />
        </button>

        <div className={styles.heroSection__info}>
          {artistId && (
            <button
              onClick={handleArtistClick}
              className={styles.heroSection__artistButton}
              aria-label={ariaLabelArtist}
            >
              {logoUrl ? (
                <img
                  key={logoUrl}
                  src={logoUrl}
                  alt={artistName}
                  className={styles.heroSection__artistLogo}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const textElement = target.nextElementSibling as HTMLElement;
                    if (textElement) {
                      textElement.style.display = 'block';
                    }
                  }}
                />
              ) : null}
              <h1
                className={styles.heroSection__artistName}
                style={{ display: logoUrl ? 'none' : 'block' }}
              >
                {artistName}
              </h1>
            </button>
          )}

          {!artistId && artistName && (
            <h1 className={styles.heroSection__artistName}>{artistName}</h1>
          )}

          <h2 className={styles.heroSection__albumTitle}>{title}</h2>
          <p
            className={`${styles.heroSection__meta} ${isPlaylist ? styles['heroSection__meta--playlist'] : ''}`}
          >
            {subtitle}
          </p>

          <button
            onClick={handlePlay}
            className={styles.heroSection__playButton}
            aria-label={isAlbum ? 'Play album' : isPlaylist ? 'Play playlist' : 'Play track'}
          >
            <Play
              size={24}
              fill="currentColor"
              strokeWidth={0}
              className={styles.heroSection__playIcon}
            />
            <span className={styles.heroSection__playText}>{t('player.play')}</span>
          </button>
        </div>

        {isAlbum && album?.albumArt && (
          <img
            src={album.albumArt}
            alt={`${title} artwork`}
            className={styles.heroSection__albumArt}
          />
        )}
      </div>
    </section>
  );
}
