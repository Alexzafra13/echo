import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { getCoverUrl, handleImageError } from '@shared/utils/cover.utils';
import { usePlayer, Track } from '@features/player';
import { useArtistImages, getArtistImageUrl, useAutoEnrichArtist, useAlbumTracks } from '../../hooks';
import { useArtistMetadataSync, useAlbumMetadataSync } from '@shared/hooks';
import { useArtist } from '@features/artists/hooks';
import type { HeroSectionProps } from '../../types';
import { isHeroAlbum, isHeroPlaylist } from '../../types';
import { logger } from '@shared/utils/logger';
import styles from './HeroSection.module.css';

/**
 * HeroSection Component
 * Displays the featured album or artist playlist with large cover, background, play button, and navigation
 * Uses Fanart.tv images when available (background and logo) with fallback to album/playlist cover
 * Automatically enriches artist metadata if not already available
 *
 * @example
 * <HeroSection
 *   item={{ type: 'album', data: featuredAlbum }}
 *   onPlay={() => playAlbum(album.id)}
 *   onNext={() => nextFeatured()}
 *   onPrevious={() => previousFeatured()}
 * />
 */
export function HeroSection({ item, onPlay, onNext, onPrevious }: HeroSectionProps) {
  const [, setLocation] = useLocation();
  const { playQueue } = usePlayer();

  // Determine if we're showing an album or playlist
  const isAlbum = isHeroAlbum(item);
  const isPlaylist = isHeroPlaylist(item);

  // Extract data based on type
  const album = isAlbum ? item.data : null;
  const playlist = isPlaylist ? item.data : null;

  // For playlists, we need the artistId from metadata
  const artistId = isAlbum
    ? album!.artistId
    : playlist?.metadata.artistId || '';

  // Real-time synchronization via SSE for artist and album metadata
  useArtistMetadataSync(artistId);
  useAlbumMetadataSync(isAlbum ? album!.id : '', artistId);

  // Fetch artist data for timestamp
  const { data: artist } = useArtist(artistId);

  // Fetch artist images from Fanart.tv
  const { data: artistImages } = useArtistImages(artistId);

  // Fetch album tracks (only for albums)
  const { data: albumTracks } = useAlbumTracks(isAlbum ? album!.id : '');

  // Check if artist has any hero images (background or logo)
  const hasHeroImages = artistImages?.images.background?.exists || artistImages?.images.logo?.exists;

  // Auto-enrich artist if they don't have hero images yet
  useAutoEnrichArtist(artistId, hasHeroImages);

  // Convert API tracks to Player tracks
  const convertAlbumToPlayerTracks = (apiTracks: any[]): Track[] => {
    if (!album) return [];
    return apiTracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artistName || album.artist || 'Unknown Artist',
      albumId: album.id,
      albumName: album.title,
      duration: track.duration || 0,
      coverImage: album.coverImage,
      // Audio normalization data (LUFS)
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
    }));
  };

  // Convert playlist tracks to Player tracks
  const convertPlaylistToPlayerTracks = (): Track[] => {
    if (!playlist || !playlist.tracks) return [];
    return playlist.tracks
      .filter(st => st.track)
      .map(st => ({
        id: st.track!.id,
        title: st.track!.title,
        artist: st.track!.artistName || 'Unknown Artist',
        albumId: st.track!.albumId,
        albumName: st.track!.albumName,
        duration: st.track!.duration || 0,
        coverImage: st.track!.albumId ? `/api/albums/${st.track!.albumId}/cover` : undefined,
        // Audio normalization data (LUFS)
        rgTrackGain: (st.track as any)?.rgTrackGain,
        rgTrackPeak: (st.track as any)?.rgTrackPeak,
      }));
  };

  const handlePlay = () => {
    onPlay?.();

    if (isAlbum && albumTracks && albumTracks.length > 0) {
      const playerTracks = convertAlbumToPlayerTracks(albumTracks);
      playQueue(playerTracks, 0);
      logger.debug('Playing album:', album!.title, 'with', albumTracks.length, 'tracks');
    } else if (isPlaylist && playlist?.tracks && playlist.tracks.length > 0) {
      const playerTracks = convertPlaylistToPlayerTracks();
      playQueue(playerTracks, 0);
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
      // Store playlist in sessionStorage and navigate to detail
      sessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
      sessionStorage.setItem('playlistReturnPath', '/');
      setLocation(`/wave-mix/${playlist!.id}`);
    }
  };

  const handleArtistClick = () => {
    if (artistId) {
      setLocation(`/artists/${artistId}`);
    }
  };

  // Determine cover URL
  const coverUrl = isAlbum
    ? getCoverUrl(album!.coverImage)
    : playlist?.coverImageUrl || '';

  // Timestamp for cache busting
  const artistTimestamp = artist?.externalInfoUpdatedAt || artist?.updatedAt;

  // Use Fanart.tv background if available, fallback to cover
  const hasBackground = artistImages?.images.background?.exists;
  const backgroundUrl = hasBackground
    ? getArtistImageUrl(artistId, 'background', artistTimestamp)
    : isAlbum
      ? (album!.backgroundImage || coverUrl)
      : coverUrl;

  // Check if artist logo is available
  const hasLogo = artistImages?.images.logo?.exists;
  const logoUrl = hasLogo ? getArtistImageUrl(artistId, 'logo', artistTimestamp) : null;

  // Determine display values
  const title = isAlbum ? album!.title : playlist!.name;
  const artistName = isAlbum ? album!.artist : playlist!.metadata.artistName || '';
  const subtitle = isAlbum
    ? `${album!.year}${album!.totalTracks ? ` • ${album!.totalTracks} Songs` : ''}`
    : playlist!.description;
  const ariaLabelCover = isAlbum ? `View ${title} album` : `View ${title} playlist`;
  const ariaLabelArtist = `View ${artistName} artist page`;

  return (
    <section className={styles.heroSection}>
      {/* Background Image with blur effect */}
      <div
        key={backgroundUrl}
        className={styles.heroSection__background}
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          backgroundPosition: hasBackground ? 'center top' : 'center center',
        }}
      />

      {/* Navigation Buttons */}
      <button
        className={styles.heroSection__navButton}
        onClick={handlePrevious}
        aria-label="Previous featured item"
      >
        <ChevronLeft size={32} />
      </button>

      <button
        className={`${styles.heroSection__navButton} ${styles['heroSection__navButton--next']}`}
        onClick={handleNext}
        aria-label="Next featured item"
      >
        <ChevronRight size={32} />
      </button>

      <div className={styles.heroSection__content}>
        {/* Cover - Clickable */}
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

        {/* Info */}
        <div className={styles.heroSection__info}>
          {/* Artist name or logo - Clickable (only if we have artistId) */}
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
            <Play size={24} fill="currentColor" strokeWidth={0} className={styles.heroSection__playIcon} />
            <span className={styles.heroSection__playText}>Reproducir</span>
          </button>
        </div>

        {/* Optional: Album Art (side image) - only for albums */}
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
