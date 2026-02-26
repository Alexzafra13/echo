import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { usePlayer, Track } from '@features/player';
import {
  useArtistImages,
  getArtistImageUrl,
  useAutoEnrichArtist,
  useAlbumTracks,
} from '../../hooks';
import { useArtistMetadataSync, useAlbumMetadataSync } from '@shared/hooks';
import { useArtist } from '@features/artists/hooks';
import type { HeroSectionProps } from '../../types';
import { isHeroAlbum, isHeroPlaylist } from '../../types';
import { logger } from '@shared/utils/logger';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import styles from './HeroSection.module.css';

export function HeroSection({ item, onPlay, onNext, onPrevious }: HeroSectionProps) {
  const [, setLocation] = useLocation();
  const { playQueue } = usePlayer();

  const isAlbum = isHeroAlbum(item);
  const isPlaylist = isHeroPlaylist(item);

  const album = isAlbum ? item.data : null;
  const playlist = isPlaylist ? item.data : null;

  const artistId = isAlbum ? album!.artistId : playlist?.metadata.artistId || '';

  useArtistMetadataSync(artistId);
  useAlbumMetadataSync(isAlbum ? album!.id : '', artistId);

  const { data: artist } = useArtist(artistId);
  const { data: artistImages } = useArtistImages(artistId);
  const { data: albumTracks } = useAlbumTracks(isAlbum ? album!.id : '');

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
      .filter((st) => st.track)
      .map((st) => ({
        id: st.track!.id,
        title: st.track!.title,
        artist: st.track!.artistName || 'Unknown Artist',
        albumId: st.track!.albumId,
        albumName: st.track!.albumName,
        duration: st.track!.duration || 0,
        coverImage: st.track!.albumId ? `/api/albums/${st.track!.albumId}/cover` : undefined,
        rgTrackGain: st.track!.rgTrackGain,
        rgTrackPeak: st.track!.rgTrackPeak,
      }));
  };

  const handlePlay = () => {
    onPlay?.();

    if (isAlbum && albumTracks && albumTracks.length > 0) {
      const playerTracks = convertAlbumToPlayerTracks(albumTracks);
      playQueue(playerTracks, 0, 'album');
      logger.debug('Playing album:', album!.title, 'with', albumTracks.length, 'tracks');
    } else if (isPlaylist && playlist?.tracks && playlist.tracks.length > 0) {
      const playerTracks = convertPlaylistToPlayerTracks();
      playQueue(playerTracks, 0, 'playlist');
      logger.debug('Playing playlist:', playlist.name, 'with', playlist.tracks.length, 'tracks');
    } else {
      logger.warn('No tracks available for:', isAlbum ? album!.id : playlist!.id);
    }
  };

  const handleNext = () => {
    onNext?.();
  };

  const handlePrevious = () => {
    onPrevious?.();
  };

  const handleCoverClick = () => {
    if (isAlbum) {
      setLocation(`/album/${album!.id}`);
    } else if (isPlaylist) {
      safeSessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
      safeSessionStorage.setItem('playlistReturnPath', '/');
      setLocation(`/wave-mix/${playlist!.id}`);
    }
  };

  const handleArtistClick = () => {
    if (artistId) {
      setLocation(`/artists/${artistId}`);
    }
  };

  const coverUrl = isAlbum ? getCoverUrl(album!.coverImage) : playlist?.coverImageUrl || '';

  const artistTimestamp = artist?.externalInfoUpdatedAt || artist?.updatedAt;

  const hasBackground = artistImages?.images.background?.exists;
  const backgroundUrl = hasBackground
    ? getArtistImageUrl(artistId, 'background', artistTimestamp)
    : isAlbum
      ? album!.backgroundImage || coverUrl
      : coverUrl;

  const hasLogo = artistImages?.images.logo?.exists;
  const logoUrl = hasLogo ? getArtistImageUrl(artistId, 'logo', artistTimestamp) : null;

  const title = isAlbum ? album!.title : playlist!.name;
  const artistName = isAlbum ? album!.artist : playlist!.metadata.artistName || '';
  const subtitle = isAlbum
    ? `${album!.year}${album!.totalTracks ? ` • ${album!.totalTracks} Songs` : ''}`
    : playlist!.description;
  const ariaLabelCover = isAlbum ? `View ${title} album` : `View ${title} playlist`;
  const ariaLabelArtist = `View ${artistName} artist page`;

  return (
    <section className={styles.heroSection}>
      <div
        key={backgroundUrl}
        className={styles.heroSection__background}
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          backgroundPosition: hasBackground ? 'center top' : 'center center',
        }}
      />

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

          <h2 className={styles.heroSection__albumTitle}>{title}</h2>
          <p className={styles.heroSection__meta}>{subtitle}</p>

          <button
            onClick={handlePlay}
            className={styles.heroSection__playButton}
            aria-label={isAlbum ? 'Play album' : 'Play playlist'}
          >
            <Play
              size={24}
              fill="currentColor"
              strokeWidth={0}
              className={styles.heroSection__playIcon}
            />
            <span className={styles.heroSection__playText}>Reproducir</span>
          </button>
        </div>

        {isAlbum && album!.albumArt && (
          <img
            src={album!.albumArt}
            alt={`${title} artwork`}
            className={styles.heroSection__albumArt}
          />
        )}
      </div>
    </section>
  );
}
