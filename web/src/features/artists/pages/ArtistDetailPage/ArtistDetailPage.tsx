import { useParams, useLocation } from 'wouter';
import { useMemo, useCallback } from 'react';
import { useModal } from '@shared/hooks';
import { Header } from '@shared/components/layout/Header';
import { Sidebar, AlbumGrid } from '@features/home/components';
import { ArtistAvatarSelectorModal } from '@features/admin/components/ArtistAvatarSelectorModal';
import { BackgroundPositionModal } from '@features/admin/components/BackgroundPositionModal';
import { useArtist, useArtistAlbums, useArtistStats, useArtistTopTracks, useRelatedArtists } from '../../hooks';
import type { ArtistTopTrack, RelatedArtist } from '../../types';
import { useArtistImages, getArtistImageUrl, useAutoEnrichArtist, useAutoPlaylists } from '@features/home/hooks';
import { usePlaylistsByArtist } from '@features/playlists/hooks/usePlaylists';
import { useAuth, useArtistMetadataSync, useAlbumMetadataSync, useDocumentTitle } from '@shared/hooks';
import { usePlayer } from '@features/player/context/PlayerContext';
import { getArtistInitials } from '../../utils/artist-image.utils';
import { logger } from '@shared/utils/logger';
import {
  HeroSection,
  TopTracksSection,
  PlaylistsSection,
  RelatedArtistsSection,
  BiographySection,
} from './components';
import styles from './ArtistDetailPage.module.css';

/**
 * ArtistDetailPage Component
 * Displays artist detail with biography, stats, and albums
 */
export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { play, pause, currentTrack, isPlaying } = usePlayer();

  // Modal states using useModal hook
  const avatarLightboxModal = useModal();
  const avatarSelectorModal = useModal<'profile' | 'background' | 'banner' | 'logo'>();
  const backgroundPositionModal = useModal();
  const { user } = useAuth();

  // Real-time synchronization via WebSocket for artist images and album covers
  useArtistMetadataSync(id);
  useAlbumMetadataSync(undefined, id);

  // Fetch artist details
  const { data: artist, isLoading: loadingArtist, error: artistError } = useArtist(id);
  useDocumentTitle(artist?.name);

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

  // Fetch auto-playlists to find artist-related playlists (Wave Mix)
  const { data: autoPlaylistsData } = useAutoPlaylists();

  // Fetch user public playlists containing artist tracks
  const { data: userPlaylistsData } = usePlaylistsByArtist(id, { take: 10 });

  // Filter auto-playlists for this artist (Wave Mix)
  const autoArtistPlaylists = useMemo(() => {
    if (!autoPlaylistsData || !id) return [];
    return autoPlaylistsData.filter(
      p => p.type === 'artist' && p.metadata.artistId === id
    );
  }, [autoPlaylistsData, id]);

  // User public playlists containing this artist's tracks
  const userPlaylists = userPlaylistsData?.items || [];

  // Check if artist has images
  const hasHeroImages = artistImages?.images.background?.exists || artistImages?.images.banner?.exists;

  // Auto-enrich artist if they don't have biography or hero images yet
  useAutoEnrichArtist(id, hasHeroImages);

  // Get albums for this artist
  const artistAlbums = artistAlbumsData?.data || [];

  // Get top tracks for this artist
  const topTracks: ArtistTopTrack[] = topTracksData?.data || [];

  // Get related artists
  const relatedArtists: RelatedArtist[] = relatedArtistsData?.data || [];

  // Determine which background image to show (most recently updated)
  const getBackgroundImageType = useCallback((): 'background' | 'banner' | null => {
    const hasBackground = artistImages?.images.background?.exists;
    const hasBanner = artistImages?.images.banner?.exists;

    if (!hasBackground && !hasBanner) return null;
    if (!hasBackground) return 'banner';
    if (!hasBanner) return 'background';

    const bgModified = artistImages?.images.background?.lastModified;
    const bannerModified = artistImages?.images.banner?.lastModified;

    if (!bgModified && !bannerModified) return 'background';
    if (!bgModified) return 'banner';
    if (!bannerModified) return 'background';

    return new Date(bgModified) >= new Date(bannerModified) ? 'background' : 'banner';
  }, [artistImages]);

  const backgroundImageType = getBackgroundImageType();
  const hasBackground = backgroundImageType !== null;
  const backgroundTag = backgroundImageType === 'background'
    ? artistImages?.images.background?.tag
    : artistImages?.images.banner?.tag;
  const backgroundUrl = hasBackground
    ? getArtistImageUrl(id!, backgroundImageType!, backgroundTag)
    : artistAlbums[0]?.coverImage;

  logger.debug('[ArtistDetailPage] Background URL:', backgroundUrl);

  // Get logo with tag-based cache busting
  const hasLogo = artistImages?.images.logo?.exists;
  const logoUrl = hasLogo ? getArtistImageUrl(id!, 'logo', artistImages?.images.logo?.tag) : null;

  // Get profile image with tag-based cache busting
  const profileUrl = artistImages?.images.profile?.exists
    ? getArtistImageUrl(id!, 'profile', artistImages?.images.profile?.tag)
    : null;

  const initials = artist ? getArtistInitials(artist.name) : '';

  // Handle playing/pausing a top track
  const handlePlayTopTrack = useCallback((track: ArtistTopTrack) => {
    const isTrackPlaying = currentTrack?.id === track.trackId && isPlaying;

    if (isTrackPlaying) {
      pause();
      return;
    }

    play({
      id: track.trackId,
      title: track.title,
      artist: artist?.name || 'Unknown Artist',
      albumId: track.albumId || undefined,
      albumName: track.albumName || undefined,
      duration: track.duration || 0,
      coverImage: track.albumId ? `/api/albums/${track.albumId}/cover` : undefined,
    });
  }, [currentTrack, isPlaying, pause, play, artist]);

  // Handlers for image menu
  const handleChangeProfile = useCallback(() => {
    avatarSelectorModal.openWith('profile');
  }, [avatarSelectorModal]);

  const handleChangeBackgroundOrBanner = useCallback(() => {
    const currentType = getBackgroundImageType() || 'background';
    avatarSelectorModal.openWith(currentType);
  }, [avatarSelectorModal, getBackgroundImageType]);

  const handleAdjustPosition = useCallback(() => {
    backgroundPositionModal.open();
  }, [backgroundPositionModal]);

  const handleChangeLogo = useCallback(() => {
    avatarSelectorModal.openWith('logo');
  }, [avatarSelectorModal]);

  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);

  // Loading state
  if (loadingArtist) {
    return (
      <div className={styles.artistDetailPage}>
        <Sidebar />
        <main className={styles.artistDetailPage__main}>
          <Header showBackButton disableSearch alwaysGlass />
          <div className={styles.artistDetailPage__loading}>Cargando artista...</div>
        </main>
      </div>
    );
  }

  // Error state
  if (artistError || !artist) {
    return (
      <div className={styles.artistDetailPage}>
        <Sidebar />
        <main className={styles.artistDetailPage__main}>
          <Header showBackButton disableSearch alwaysGlass />
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
        <Header showBackButton disableSearch alwaysGlass />

        <div className={styles.artistDetailPage__content}>
          {/* Hero Section */}
          <HeroSection
            artist={artist}
            artistStats={artistStats}
            profileUrl={profileUrl}
            backgroundUrl={backgroundUrl}
            logoUrl={logoUrl}
            hasBackground={hasBackground}
            initials={initials}
            isAdmin={user?.isAdmin || false}
            onAvatarClick={avatarLightboxModal.open}
            onChangeProfile={handleChangeProfile}
            onChangeBackground={handleChangeBackgroundOrBanner}
            onAdjustPosition={handleAdjustPosition}
            onChangeLogo={handleChangeLogo}
          />

          {/* Top Tracks Section */}
          <TopTracksSection
            tracks={topTracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTopTrack}
          />

          {/* Albums Section */}
          {artistAlbums.length > 0 ? (
            <section className={styles.artistDetailPage__albums}>
              <AlbumGrid
                title={`Álbumes de ${artist.name}`}
                albums={artistAlbums}
              />
            </section>
          ) : (
            <section className={styles.artistDetailPage__albums}>
              <h2 className={styles.artistDetailPage__sectionTitle}>Álbumes</h2>
              <p className={styles.artistDetailPage__emptyAlbums}>
                No hay álbumes disponibles para este artista.
              </p>
            </section>
          )}

          {/* Playlists Section */}
          <PlaylistsSection
            artistName={artist.name}
            autoPlaylists={autoArtistPlaylists}
            userPlaylists={userPlaylists}
            onNavigate={handleNavigate}
          />

          {/* Related Artists Section */}
          <RelatedArtistsSection
            artists={relatedArtists}
            onNavigate={handleNavigate}
          />

          {/* Biography Section */}
          <BiographySection
            biography={artist.biography}
            biographySource={artist.biographySource}
          />
        </div>
      </main>

      {/* Avatar Modal/Lightbox */}
      {avatarLightboxModal.isOpen && profileUrl && (
        <div
          className={styles.artistDetailPage__imageModal}
          onClick={avatarLightboxModal.close}
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
      {avatarSelectorModal.isOpen && artist && avatarSelectorModal.data && (
        <ArtistAvatarSelectorModal
          artistId={artist.id}
          artistName={artist.name}
          defaultType={avatarSelectorModal.data}
          allowedTypes={
            avatarSelectorModal.data === 'background' || avatarSelectorModal.data === 'banner'
              ? ['background', 'banner']
              : [avatarSelectorModal.data]
          }
          onClose={avatarSelectorModal.close}
          onSuccess={() => {
            avatarSelectorModal.close();
          }}
        />
      )}

      {/* Background Position Adjustment Modal */}
      {backgroundPositionModal.isOpen && artist && backgroundUrl && (
        <BackgroundPositionModal
          artistId={artist.id}
          artistName={artist.name}
          backgroundUrl={backgroundUrl}
          initialPosition={artist.backgroundPosition}
          onClose={backgroundPositionModal.close}
          onSuccess={() => {
            backgroundPositionModal.close();
          }}
        />
      )}
    </div>
  );
}
