import { useParams } from 'wouter';
import { Lock, User as UserIcon, TrendingUp } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { usePublicProfile } from '../../hooks';
import { useProfileListeningSSE } from '../../hooks/useProfileListeningSSE';
import {
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriendship,
} from '@features/social/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useDominantColor } from '@shared/hooks';
import { Avatar } from './Avatar';
import { ListeningNowBadge } from './ListeningNowBadge';
import { FriendButton } from './FriendButton';
import { ArtistCard } from './ArtistCard';
import { AlbumCard } from './AlbumCard';
import { TrackItem, formatPlayCount } from './TrackItem';
import { PlaylistCard } from './PlaylistCard';
import styles from './PublicProfilePage.module.css';

// =============================================================================
// Main Component
// =============================================================================

export function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId || '';
  const { data: profile, isLoading, error } = usePublicProfile(userId);
  const queryClient = useQueryClient();

  // Enable real-time SSE updates for this profile's "listening now" state
  useProfileListeningSSE(userId);

  // Mutations
  const sendRequestMutation = useSendFriendRequest();
  const acceptRequestMutation = useAcceptFriendRequest();
  const removeRequestMutation = useRemoveFriendship();

  const isActionLoading =
    sendRequestMutation.isPending ||
    acceptRequestMutation.isPending ||
    removeRequestMutation.isPending;

  // Handlers
  const handleSendRequest = async () => {
    await sendRequestMutation.mutateAsync(userId);
    queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
  };

  const handleAcceptRequest = async () => {
    if (profile?.social.friendshipId) {
      await acceptRequestMutation.mutateAsync(profile.social.friendshipId);
      queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
    }
  };

  const handleCancelRequest = async () => {
    if (profile?.social.friendshipId) {
      await removeRequestMutation.mutateAsync(profile.social.friendshipId);
      queryClient.invalidateQueries({ queryKey: ['public-profile', userId] });
    }
  };

  // Extract dominant color from user avatar for hero gradient
  const dominantColor = useDominantColor(profile?.user.avatarUrl);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.publicProfilePage}>
        <Sidebar />
        <main className={styles.publicProfilePage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.publicProfilePage__content}>
            <div className={styles.publicProfilePage__loading}>
              <div>Cargando perfil...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className={styles.publicProfilePage}>
        <Sidebar />
        <main className={styles.publicProfilePage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.publicProfilePage__content}>
            <div className={styles.publicProfilePage__privateMessage}>
              <div className={styles.publicProfilePage__privateIcon}>
                <UserIcon size={40} />
              </div>
              <h2>Usuario no encontrado</h2>
              <p>El usuario que buscas no existe o ha sido eliminado.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { user, topTracks, topArtists, topAlbums, playlists, settings, social } = profile;

  // Private profile view
  if (!user.isPublicProfile) {
    return (
      <div className={styles.publicProfilePage}>
        <Sidebar />
        <main className={styles.publicProfilePage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.publicProfilePage__content}>
            <div
              className={styles.publicProfilePage__hero}
              style={{
                background: `linear-gradient(180deg,
                  rgba(${dominantColor}, 0.5) 0%,
                  rgba(${dominantColor}, 0.3) 40%,
                  transparent 100%)`,
              }}
            >
              <div className={styles.publicProfilePage__heroContent}>
                <Avatar avatarUrl={user.avatarUrl} name={user.name} username={user.username} />
                <div className={styles.publicProfilePage__heroInfo}>
                  <span className={styles.publicProfilePage__profileLabel}>Perfil</span>
                  <h1 className={styles.publicProfilePage__name}>{user.name || user.username}</h1>
                </div>
              </div>
            </div>

            {/* Actions Bar - also show on private profiles */}
            {social.friendshipStatus !== 'self' && (
              <div className={styles.publicProfilePage__actions}>
                <FriendButton
                  status={social.friendshipStatus}
                  friendshipId={social.friendshipId}
                  onSendRequest={handleSendRequest}
                  onAcceptRequest={handleAcceptRequest}
                  onCancelRequest={handleCancelRequest}
                  isLoading={isActionLoading}
                />
              </div>
            )}

            <div className={styles.publicProfilePage__privateMessage}>
              <div className={styles.publicProfilePage__privateIcon}>
                <Lock size={40} />
              </div>
              <h2>Perfil privado</h2>
              <p>Este usuario ha configurado su perfil como privado.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Public profile view
  const hasContent =
    (topArtists && topArtists.length > 0) ||
    (topAlbums && topAlbums.length > 0) ||
    (topTracks && topTracks.length > 0) ||
    (playlists && playlists.length > 0);

  return (
    <div className={styles.publicProfilePage}>
      <Sidebar />
      <main className={styles.publicProfilePage__main}>
        <Header showBackButton disableSearch />
        <div className={styles.publicProfilePage__content}>
          {/* Hero Section */}
          <div
            className={styles.publicProfilePage__hero}
            style={{
              background: `linear-gradient(180deg,
                rgba(${dominantColor}, 0.5) 0%,
                rgba(${dominantColor}, 0.3) 40%,
                transparent 100%)`,
            }}
          >
            <div className={styles.publicProfilePage__heroContent}>
              <Avatar avatarUrl={user.avatarUrl} name={user.name} username={user.username} />
              <div className={styles.publicProfilePage__heroInfo}>
                <span className={styles.publicProfilePage__profileLabel}>Perfil</span>
                <h1 className={styles.publicProfilePage__name}>{user.name || user.username}</h1>

                {/* Meta info */}
                <div className={styles.publicProfilePage__meta}>
                  {user.name && <span>@{user.username}</span>}
                  {user.name && <span className={styles.publicProfilePage__metaDot} />}
                  <span>
                    <span className={styles.publicProfilePage__metaHighlight}>
                      {formatPlayCount(social.stats.totalPlays)}
                    </span>{' '}
                    reproducciones
                  </span>
                  <span className={styles.publicProfilePage__metaDot} />
                  <span>
                    <span className={styles.publicProfilePage__metaHighlight}>
                      {social.stats.friendCount}
                    </span>{' '}
                    amigos
                  </span>
                </div>

                {/* Bio */}
                {user.bio && <p className={styles.publicProfilePage__bio}>{user.bio}</p>}
              </div>

              {/* Listening Now - positioned to the right */}
              <ListeningNowBadge listeningNow={social.listeningNow ?? null} />
            </div>
          </div>

          {/* Actions Bar */}
          {social.friendshipStatus !== 'self' && (
            <div className={styles.publicProfilePage__actions}>
              <FriendButton
                status={social.friendshipStatus}
                friendshipId={social.friendshipId}
                onSendRequest={handleSendRequest}
                onAcceptRequest={handleAcceptRequest}
                onCancelRequest={handleCancelRequest}
                isLoading={isActionLoading}
              />
            </div>
          )}

          {/* Content Sections */}
          <div className={styles.publicProfilePage__contentInner}>
            {/* Top Tracks - First */}
            {settings.showTopTracks && topTracks && topTracks.length > 0 && (
              <section className={styles.publicProfilePage__section}>
                <div className={styles.publicProfilePage__sectionHeader}>
                  <TrendingUp size={24} className={styles.publicProfilePage__sectionIcon} />
                  <h2 className={styles.publicProfilePage__sectionTitle}>
                    Canciones más escuchadas
                  </h2>
                </div>
                <div className={styles.publicProfilePage__trackList}>
                  {topTracks.map((track, index) => (
                    <TrackItem key={track.id} track={track} index={index} />
                  ))}
                </div>
              </section>
            )}

            {/* Top Artists - Second */}
            {settings.showTopArtists && topArtists && topArtists.length > 0 && (
              <section className={styles.publicProfilePage__section}>
                <div className={styles.publicProfilePage__sectionHeader}>
                  <h2 className={styles.publicProfilePage__sectionTitle}>
                    Artistas más escuchados
                  </h2>
                </div>
                <div className={styles.publicProfilePage__artistsGrid}>
                  {topArtists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}

            {/* Top Albums - Third */}
            {settings.showTopAlbums && topAlbums && topAlbums.length > 0 && (
              <section className={styles.publicProfilePage__section}>
                <div className={styles.publicProfilePage__sectionHeader}>
                  <h2 className={styles.publicProfilePage__sectionTitle}>Álbumes más escuchados</h2>
                </div>
                <div className={styles.publicProfilePage__albumsGrid}>
                  {topAlbums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              </section>
            )}

            {/* Playlists - Fourth */}
            {settings.showPlaylists && playlists && playlists.length > 0 && (
              <section className={styles.publicProfilePage__section}>
                <div className={styles.publicProfilePage__sectionHeader}>
                  <h2 className={styles.publicProfilePage__sectionTitle}>Playlists públicas</h2>
                </div>
                <div className={styles.publicProfilePage__playlistGrid}>
                  {playlists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!hasContent && (
              <div className={styles.publicProfilePage__empty}>
                Este usuario aún no tiene actividad para mostrar.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
