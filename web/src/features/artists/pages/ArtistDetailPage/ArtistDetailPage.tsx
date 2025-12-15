import { useParams, useLocation } from 'wouter';
import { BookOpen, Music, Users, Play, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, AlbumGrid } from '@features/home/components';
import { ArtistOptionsMenu } from '../../components';
import { ArtistAvatarSelectorModal } from '@features/admin/components/ArtistAvatarSelectorModal';
import { BackgroundPositionModal } from '@features/admin/components/BackgroundPositionModal';
import { useArtist, useArtistAlbums, useArtistStats, useArtistTopTracks, useRelatedArtists } from '../../hooks';
import { useArtistImages, getArtistImageUrl, useAutoEnrichArtist } from '@features/home/hooks';
import { useAuth, useArtistMetadataSync, useAlbumMetadataSync } from '@shared/hooks';
import { usePlayer } from '@features/player/context/PlayerContext';
import { getArtistInitials } from '../../utils/artist-image.utils';
import { logger } from '@shared/utils/logger';
import styles from './ArtistDetailPage.module.css';

/**
 * ArtistDetailPage Component
 * Displays artist detail with biography, stats, and albums
 */
export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const { play, addToQueue } = usePlayer();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [isBackgroundPositionModalOpen, setIsBackgroundPositionModalOpen] = useState(false);
  const [selectedImageType, setSelectedImageType] = useState<'profile' | 'background' | 'banner' | 'logo'>('profile');
  const [imageRenderKey, setImageRenderKey] = useState(0);
  const [logoRenderKey, setLogoRenderKey] = useState(0);
  const [profileRenderKey, setProfileRenderKey] = useState(0);
  const { user } = useAuth();

  // Real-time synchronization via WebSocket for artist images and album covers
  useArtistMetadataSync(id);
  useAlbumMetadataSync(undefined, id); // Sync albums for this artist

  // Fetch artist details
  const { data: artist, isLoading: loadingArtist, error: artistError } = useArtist(id);

  // Fetch albums for this artist directly from the API
  const { data: artistAlbumsData } = useArtistAlbums(id);

  // Fetch artist global stats (total plays, unique listeners)
  const { data: artistStats } = useArtistStats(id);

  // Fetch top tracks for this artist
  const { data: topTracksData } = useArtistTopTracks(id, 10);

  // Fetch related artists
  const { data: relatedArtistsData } = useRelatedArtists(id, 8);

  // Fetch artist images from Fanart.tv
  const { data: artistImages } = useArtistImages(id);

  // Check if artist has images
  const hasHeroImages = artistImages?.images.background?.exists || artistImages?.images.banner?.exists;

  // Auto-enrich artist if they don't have biography or hero images yet
  useAutoEnrichArtist(id, hasHeroImages);

  // Get albums for this artist
  const artistAlbums = artistAlbumsData?.data || [];

  // Get top tracks for this artist
  const topTracks = topTracksData?.data || [];

  // Get related artists
  const relatedArtists = relatedArtistsData?.data || [];

  // Helper function to format duration (mm:ss)
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to format play count
  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Handle playing a top track
  const handlePlayTopTrack = (track: typeof topTracks[0]) => {
    play({
      id: track.trackId,
      title: track.title,
      artist: artist?.name || 'Unknown Artist',
      albumId: track.albumId || undefined,
      albumName: track.albumName || undefined,
      duration: track.duration || 0,
      coverImage: track.albumId ? `/api/albums/${track.albumId}/cover` : undefined,
    });
  };

  // Get background image with tag-based cache busting (V2)
  // Determine which background image to show (most recently updated)
  const getBackgroundImageType = (): 'background' | 'banner' | null => {
    const hasBackground = artistImages?.images.background?.exists;
    const hasBanner = artistImages?.images.banner?.exists;

    if (!hasBackground && !hasBanner) return null;
    if (!hasBackground) return 'banner';
    if (!hasBanner) return 'background';

    // Both exist, use the most recently updated one
    const bgModified = artistImages?.images.background?.lastModified;
    const bannerModified = artistImages?.images.banner?.lastModified;

    if (!bgModified && !bannerModified) return 'background'; // Default to background if no timestamps
    if (!bgModified) return 'banner';
    if (!bannerModified) return 'background';

    return new Date(bgModified) >= new Date(bannerModified) ? 'background' : 'banner';
  };

  const backgroundImageType = getBackgroundImageType();
  const hasBackground = backgroundImageType !== null;
  const backgroundTag = backgroundImageType === 'background'
    ? artistImages?.images.background?.tag
    : artistImages?.images.banner?.tag;
  const backgroundUrl = hasBackground
    ? getArtistImageUrl(id!, backgroundImageType!, backgroundTag)
    : artistAlbums[0]?.coverImage; // Fallback to first album cover

  logger.debug('[ArtistDetailPage] Background URL:', backgroundUrl);

  // CRITICAL: Force browser to reload background image when URL changes
  // This is needed because CSS background-image doesn't always respect cache headers
  useEffect(() => {
    if (backgroundUrl) {
      logger.debug('[ArtistDetailPage] 🔄 Forcing background image preload:', backgroundUrl);
      const img = new window.Image();
      img.src = backgroundUrl;
      img.onload = () => {
        logger.debug('[ArtistDetailPage] ✅ Background image preloaded successfully');
        // Force React to destroy and recreate the background div
        // This helps clear any browser memory cache of the old image
        setImageRenderKey(prev => prev + 1);
      };
      img.onerror = (e) => {
        logger.error('[ArtistDetailPage] ❌ Failed to preload background:', e);
      };
    }
  }, [backgroundUrl]);

  // Get logo with tag-based cache busting (V2)
  const hasLogo = artistImages?.images.logo?.exists;
  const logoUrl = hasLogo ? getArtistImageUrl(id!, 'logo', artistImages?.images.logo?.tag) : null;

  // Get profile image with tag-based cache busting (V2 - unified profile)
  const profileUrl = artistImages?.images.profile?.exists
    ? getArtistImageUrl(id!, 'profile', artistImages?.images.profile?.tag)
    : null;

  const initials = artist ? getArtistInitials(artist.name) : '';

  // Force preload of logo to break browser cache
  useEffect(() => {
    if (logoUrl) {
      logger.debug('[ArtistDetailPage] 🔄 Preloading logo:', logoUrl);
      const img = new window.Image();
      img.src = logoUrl;
      img.onload = () => {
        logger.debug('[ArtistDetailPage] ✅ Logo preloaded successfully');
        setLogoRenderKey(prev => prev + 1);
      };
    }
  }, [logoUrl]);

  // Force preload of profile image to break browser cache
  useEffect(() => {
    if (profileUrl) {
      logger.debug('[ArtistDetailPage] 🔄 Preloading profile:', profileUrl);
      const img = new window.Image();
      img.src = profileUrl;
      img.onload = () => {
        logger.debug('[ArtistDetailPage] ✅ Profile image preloaded successfully');
        setProfileRenderKey(prev => prev + 1);
      };
    }
  }, [profileUrl]);

  // Handlers for image menu
  const handleChangeProfile = () => {
    setSelectedImageType('profile');
    setIsAvatarSelectorOpen(true);
  };

  const handleChangeBackgroundOrBanner = () => {
    // Pre-select whichever type is currently shown (most recently updated)
    const currentType = getBackgroundImageType() || 'background';
    setSelectedImageType(currentType);
    setIsAvatarSelectorOpen(true);
  };

  const handleAdjustPosition = () => {
    setIsBackgroundPositionModalOpen(true);
  };

  const handleChangeLogo = () => {
    setSelectedImageType('logo');
    setIsAvatarSelectorOpen(true);
  };

  // Helper to format biography with drop cap
  const formatBiographyWithDropCap = (text: string) => {
    if (!text || text.length === 0) return text;
    const firstChar = text.charAt(0);
    const restOfText = text.slice(1);
    return (
      <>
        <span className={styles.artistDetailPage__dropCap}>{firstChar}</span>
        {restOfText}
      </>
    );
  };

  if (loadingArtist) {
    return (
      <div className={styles.artistDetailPage}>
        <Sidebar />
        <main className={styles.artistDetailPage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.artistDetailPage__loading}>Cargando artista...</div>
        </main>
      </div>
    );
  }

  if (artistError || !artist) {
    return (
      <div className={styles.artistDetailPage}>
        <Sidebar />
        <main className={styles.artistDetailPage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.artistDetailPage__error}>
            Error al cargar artista
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.artistDetailPage}>
      <Sidebar />

      <main className={styles.artistDetailPage__main}>
        <Header showBackButton disableSearch />

        <div className={styles.artistDetailPage__content}>
          {/* Hero Section */}
          <section className={styles.artistDetailPage__hero}>
            {/* Background */}
            {backgroundUrl && (
              <div
                key={`${backgroundUrl}-${imageRenderKey}`} // Force complete re-render when image changes
                className={styles.artistDetailPage__background}
                style={{
                  backgroundImage: `url(${backgroundUrl})`,
                  // Use saved position, or default based on image type
                  backgroundPosition: artist?.backgroundPosition ||
                    (hasBackground ? 'center top' : 'center center'),
                }}
              />
            )}

            <div className={styles.artistDetailPage__heroContent}>
              {/* Artist Avatar/Profile */}
              <div className={styles.artistDetailPage__avatarContainer}>
                {profileUrl ? (
                  <img
                    key={`${profileUrl}-${profileRenderKey}`} // Force complete re-render when image changes
                    src={profileUrl}
                    alt={artist.name}
                    className={styles.artistDetailPage__avatar}
                    onClick={() => setIsAvatarModalOpen(true)}
                  />
                ) : (
                  <div className={styles.artistDetailPage__avatarFallback}>
                    {initials}
                  </div>
                )}
                {user?.isAdmin && (
                  <ArtistOptionsMenu
                    onChangeProfile={handleChangeProfile}
                    onChangeBackground={handleChangeBackgroundOrBanner}
                    onAdjustPosition={handleAdjustPosition}
                    onChangeLogo={handleChangeLogo}
                    hasBackground={backgroundUrl !== undefined && hasBackground}
                  />
                )}
              </div>

              {/* Artist Info */}
              <div className={styles.artistDetailPage__info}>
                {/* Logo or Name */}
                {logoUrl ? (
                  <img
                    key={`${logoUrl}-${logoRenderKey}`} // Force complete re-render when logo changes
                    src={logoUrl}
                    alt={artist.name}
                    className={styles.artistDetailPage__logo}
                  />
                ) : (
                  <h1 className={styles.artistDetailPage__name}>{artist.name}</h1>
                )}

                {/* Stats */}
                <div className={styles.artistDetailPage__stats}>
                  <span>{artist.albumCount} {artist.albumCount === 1 ? 'álbum' : 'álbumes'}</span>
                  <span>•</span>
                  <span>{artist.songCount} {artist.songCount === 1 ? 'canción' : 'canciones'}</span>
                  {artistStats && artistStats.totalPlays > 0 && (
                    <>
                      <span>•</span>
                      <span>{formatPlayCount(artistStats.totalPlays)} reproducciones</span>
                      <span>•</span>
                      <span>{artistStats.uniqueListeners} {artistStats.uniqueListeners === 1 ? 'oyente' : 'oyentes'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Biography Section */}
          {artist.biography && (
            <section className={styles.artistDetailPage__biography}>
              <div className={styles.artistDetailPage__biographyHeader}>
                <BookOpen size={24} className={styles.artistDetailPage__biographyIcon} />
                <h2 className={styles.artistDetailPage__sectionTitle}>Biografía</h2>
              </div>

              <div className={styles.artistDetailPage__biographyContent}>
                <div className={`${styles.artistDetailPage__biographyText} ${
                  !isBioExpanded && artist.biography.length > 500 ? styles.artistDetailPage__biographyText__collapsed : ''
                }`}>
                  {formatBiographyWithDropCap(artist.biography)}
                </div>

                {artist.biography.length > 500 && (
                  <button
                    className={styles.artistDetailPage__biographyToggle}
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                  >
                    {isBioExpanded ? 'Leer menos' : 'Leer más'}
                  </button>
                )}

                {artist.biographySource && (
                  <div className={styles.artistDetailPage__biographySource}>
                    Fuente: {artist.biographySource === 'wikipedia' ? 'Wikipedia' :
                            artist.biographySource === 'lastfm' ? 'Last.fm' :
                            artist.biographySource}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* No Biography Placeholder */}
          {!artist.biography && (
            <section className={styles.artistDetailPage__biography}>
              <div className={styles.artistDetailPage__biographyHeader}>
                <BookOpen size={24} className={styles.artistDetailPage__biographyIcon} />
                <h2 className={styles.artistDetailPage__sectionTitle}>Biografía</h2>
              </div>
              <p className={styles.artistDetailPage__biographyPlaceholder}>
                No hay biografía disponible para este artista.
              </p>
            </section>
          )}

          {/* Top Tracks Section */}
          {topTracks.length > 0 && (
            <section className={styles.artistDetailPage__topTracks}>
              <div className={styles.artistDetailPage__sectionHeader}>
                <TrendingUp size={24} className={styles.artistDetailPage__sectionIcon} />
                <h2 className={styles.artistDetailPage__sectionTitle}>Canciones populares</h2>
              </div>
              <div className={styles.artistDetailPage__topTracksList}>
                {topTracks.map((track, index) => (
                  <div
                    key={track.trackId}
                    className={styles.artistDetailPage__topTrack}
                    onClick={() => handlePlayTopTrack(track)}
                  >
                    <span className={styles.artistDetailPage__topTrackRank}>{index + 1}</span>
                    {track.albumId && (
                      <img
                        src={`/api/albums/${track.albumId}/cover`}
                        alt={track.albumName || track.title}
                        className={styles.artistDetailPage__topTrackCover}
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-album.png';
                        }}
                      />
                    )}
                    {!track.albumId && (
                      <div className={styles.artistDetailPage__topTrackCoverPlaceholder}>
                        <Music size={16} />
                      </div>
                    )}
                    <div className={styles.artistDetailPage__topTrackInfo}>
                      <span className={styles.artistDetailPage__topTrackTitle}>{track.title}</span>
                      {track.albumName && (
                        <span className={styles.artistDetailPage__topTrackAlbum}>{track.albumName}</span>
                      )}
                    </div>
                    <div className={styles.artistDetailPage__topTrackStats}>
                      <span className={styles.artistDetailPage__topTrackPlays}>
                        {formatPlayCount(track.playCount)} plays
                      </span>
                    </div>
                    <span className={styles.artistDetailPage__topTrackDuration}>
                      {formatDuration(track.duration)}
                    </span>
                    <button
                      className={styles.artistDetailPage__topTrackPlay}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTopTrack(track);
                      }}
                      aria-label={`Reproducir ${track.title}`}
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related Artists Section */}
          {relatedArtists.length > 0 && (
            <section className={styles.artistDetailPage__relatedArtists}>
              <div className={styles.artistDetailPage__sectionHeader}>
                <Users size={24} className={styles.artistDetailPage__sectionIcon} />
                <h2 className={styles.artistDetailPage__sectionTitle}>Artistas similares</h2>
              </div>
              <div className={styles.artistDetailPage__relatedArtistsGrid}>
                {relatedArtists.map((relArtist) => (
                  <div
                    key={relArtist.id}
                    className={styles.artistDetailPage__relatedArtist}
                    onClick={() => setLocation(`/artists/${relArtist.id}`)}
                  >
                    <div className={styles.artistDetailPage__relatedArtistAvatar}>
                      <img
                        src={getArtistImageUrl(relArtist.id, 'profile')}
                        alt={relArtist.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className={styles.artistDetailPage__relatedArtistFallback} style={{ display: 'none' }}>
                        {getArtistInitials(relArtist.name)}
                      </div>
                    </div>
                    <div className={styles.artistDetailPage__relatedArtistInfo}>
                      <span className={styles.artistDetailPage__relatedArtistName}>{relArtist.name}</span>
                      <span className={styles.artistDetailPage__relatedArtistMeta}>
                        {relArtist.commonListeners} oyentes en común
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums Section */}
          {artistAlbums.length > 0 && (
            <section className={styles.artistDetailPage__albums}>
              <AlbumGrid
                title={`Álbumes de ${artist.name}`}
                albums={artistAlbums}
              />
            </section>
          )}

          {/* No Albums */}
          {artistAlbums.length === 0 && (
            <section className={styles.artistDetailPage__albums}>
              <h2 className={styles.artistDetailPage__sectionTitle}>Álbumes</h2>
              <p className={styles.artistDetailPage__emptyAlbums}>
                No hay álbumes disponibles para este artista.
              </p>
            </section>
          )}
        </div>
      </main>

      {/* Avatar Modal/Lightbox */}
      {isAvatarModalOpen && profileUrl && (
        <div
          className={styles.artistDetailPage__imageModal}
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div className={styles.artistDetailPage__imageModalContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={profileUrl}
              alt={artist.name}
              className={styles.artistDetailPage__imageModalImage}
            />
          </div>
        </div>
      )}

      {/* Avatar Selector Modal */}
      {isAvatarSelectorOpen && artist && (
        <ArtistAvatarSelectorModal
          artistId={artist.id}
          artistName={artist.name}
          defaultType={selectedImageType}
          allowedTypes={
            selectedImageType === 'background' || selectedImageType === 'banner'
              ? ['background', 'banner']
              : [selectedImageType]
          }
          onClose={() => setIsAvatarSelectorOpen(false)}
          onSuccess={() => {
            // WebSocket will automatically sync the changes via useArtistMetadataSync
            // No need for window.location.reload() - React Query handles it
            setIsAvatarSelectorOpen(false);
          }}
        />
      )}

      {/* Background Position Adjustment Modal */}
      {isBackgroundPositionModalOpen && artist && backgroundUrl && (
        <BackgroundPositionModal
          artistId={artist.id}
          artistName={artist.name}
          backgroundUrl={backgroundUrl}
          initialPosition={artist.backgroundPosition}
          onClose={() => setIsBackgroundPositionModalOpen(false)}
          onSuccess={() => {
            // WebSocket will automatically sync the changes
            setIsBackgroundPositionModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
