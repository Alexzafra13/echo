import { useMemo, useState, useEffect, CSSProperties } from 'react';
import { useParams, Link } from 'wouter';
import {
  Lock,
  Music,
  Disc,
  User as UserIcon,
  UserPlus,
  UserCheck,
  Clock,
  X,
  Check,
} from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import { usePublicProfile } from '../../hooks';
import { useProfileListeningSSE } from '../../hooks/useProfileListeningSSE';
import {
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriendship,
} from '@features/social/hooks';
import { formatDuration } from '@shared/utils/format';
import { useQueryClient } from '@tanstack/react-query';
import type {
  FriendshipStatus,
  TopArtist,
  TopAlbum,
  TopTrack,
  PublicPlaylist,
  ListeningNow,
} from '../../services/public-profiles.service';
import styles from './PublicProfilePage.module.css';

// =============================================================================
// Types
// =============================================================================

interface HeroColorStyle extends CSSProperties {
  '--hero-color': string;
}

// =============================================================================
// Helper Functions
// =============================================================================

const getUserInitials = (name?: string, username?: string): string => {
  const displayName = name || username || 'U';
  return displayName.slice(0, 2).toUpperCase();
};

const formatPlayCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

/**
 * Extracts a dominant color from an image URL (simplified version)
 * In production, you'd use a library like color-thief or vibrant.js
 */
const getHeroColor = (coverUrl?: string): string => {
  // Default colors for profiles without album art
  const defaultColors = [
    '#4a3470', // Purple
    '#1e3a5f', // Blue
    '#3d4f2f', // Green
    '#5c3d2e', // Brown
    '#4a4458', // Gray-purple
  ];

  if (!coverUrl) {
    // Return a consistent color based on the URL hash (or random for new profiles)
    return defaultColors[Math.floor(Math.random() * defaultColors.length)];
  }

  // For now, return a nice purple. In production, extract from image.
  return '#4a3470';
};

// =============================================================================
// Sub-components
// =============================================================================

interface AvatarProps {
  avatarUrl?: string;
  name?: string;
  username?: string;
}

function Avatar({ avatarUrl, name, username }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || username}
        className={styles.publicProfilePage__avatar}
      />
    );
  }

  return (
    <div className={styles.publicProfilePage__avatarPlaceholder}>
      {getUserInitials(name, username)}
    </div>
  );
}

interface ListeningNowBadgeProps {
  listeningNow: ListeningNow | null;
}

function ListeningNowBadge({ listeningNow }: ListeningNowBadgeProps) {
  const [displayData, setDisplayData] = useState<ListeningNow | null>(listeningNow);
  const [isVisible, setIsVisible] = useState(!!listeningNow);

  useEffect(() => {
    if (listeningNow) {
      // New data: show immediately
      setDisplayData(listeningNow);
      setIsVisible(true);
    } else if (displayData) {
      // Data removed: fade out first, then remove
      setIsVisible(false);
      const timer = setTimeout(() => setDisplayData(null), 500);
      return () => clearTimeout(timer);
    }
  }, [listeningNow]);

  if (!displayData) return null;

  const className = `${styles.publicProfilePage__listeningNow} ${
    isVisible ? styles['publicProfilePage__listeningNow--visible'] : styles['publicProfilePage__listeningNow--hidden']
  }`;

  return (
    <Link
      href={displayData.albumId ? `/album/${displayData.albumId}` : '#'}
      className={className}
    >
      {displayData.coverUrl ? (
        <img
          src={displayData.coverUrl}
          alt={displayData.trackTitle}
          className={styles.publicProfilePage__listeningNowCover}
        />
      ) : (
        <div className={styles.publicProfilePage__listeningNowCoverPlaceholder}>
          <Music size={20} />
        </div>
      )}
      <div className={styles.publicProfilePage__listeningNowInfo}>
        <span className={styles.publicProfilePage__listeningNowLabel}>
          Escuchando ahora
        </span>
        <span className={styles.publicProfilePage__listeningNowTrack}>
          {displayData.trackTitle}
        </span>
        {displayData.artistName && (
          <span className={styles.publicProfilePage__listeningNowArtist}>
            {displayData.artistName}
          </span>
        )}
      </div>
      <div className={styles.publicProfilePage__listeningNowBars}>
        <span className={styles.publicProfilePage__listeningNowBar} />
        <span className={styles.publicProfilePage__listeningNowBar} />
        <span className={styles.publicProfilePage__listeningNowBar} />
        <span className={styles.publicProfilePage__listeningNowBar} />
      </div>
    </Link>
  );
}

interface FriendButtonProps {
  status: FriendshipStatus;
  friendshipId?: string;
  onSendRequest: () => void;
  onAcceptRequest: () => void;
  onCancelRequest: () => void;
  isLoading: boolean;
}

function FriendButton({
  status,
  onSendRequest,
  onAcceptRequest,
  onCancelRequest,
  isLoading,
}: FriendButtonProps) {
  if (status === 'self') return null;

  switch (status) {
    case 'none':
      return (
        <button
          className={`${styles.publicProfilePage__friendBtn} ${styles['publicProfilePage__friendBtn--primary']}`}
          onClick={onSendRequest}
          disabled={isLoading}
        >
          <UserPlus size={18} />
          Añadir amigo
        </button>
      );

    case 'pending_sent':
      return (
        <button
          className={`${styles.publicProfilePage__friendBtn} ${styles['publicProfilePage__friendBtn--pending']}`}
          onClick={onCancelRequest}
          disabled={isLoading}
        >
          <Clock size={18} />
          Solicitud enviada
        </button>
      );

    case 'pending_received':
      return (
        <div className={styles.publicProfilePage__friendActions}>
          <button
            className={`${styles.publicProfilePage__friendBtn} ${styles['publicProfilePage__friendBtn--primary']}`}
            onClick={onAcceptRequest}
            disabled={isLoading}
          >
            <Check size={18} />
            Aceptar
          </button>
          <button
            className={`${styles.publicProfilePage__iconBtn} ${styles['publicProfilePage__iconBtn--danger']}`}
            onClick={onCancelRequest}
            disabled={isLoading}
            aria-label="Rechazar solicitud"
          >
            <X size={18} />
          </button>
        </div>
      );

    case 'accepted':
      return (
        <button
          className={`${styles.publicProfilePage__friendBtn} ${styles['publicProfilePage__friendBtn--accepted']}`}
          disabled
        >
          <UserCheck size={18} />
          Amigos
        </button>
      );

    default:
      return null;
  }
}

interface ArtistCardProps {
  artist: TopArtist;
}

function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link href={`/artists/${artist.id}`} className={styles.publicProfilePage__artistCard}>
      {artist.imageUrl ? (
        <img
          src={artist.imageUrl}
          alt={artist.name}
          className={styles.publicProfilePage__artistImage}
        />
      ) : (
        <div className={styles.publicProfilePage__artistPlaceholder}>
          <UserIcon size={40} />
        </div>
      )}
      <h3 className={styles.publicProfilePage__artistName}>{artist.name}</h3>
      <p className={styles.publicProfilePage__artistMeta}>Artista</p>
    </Link>
  );
}

interface AlbumCardProps {
  album: TopAlbum;
}

function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link href={`/album/${album.id}`} className={styles.publicProfilePage__albumCard}>
      {album.coverUrl ? (
        <img
          src={album.coverUrl}
          alt={album.name}
          className={styles.publicProfilePage__albumCover}
        />
      ) : (
        <div className={styles.publicProfilePage__albumPlaceholder}>
          <Disc size={48} />
        </div>
      )}
      <h3 className={styles.publicProfilePage__albumName}>{album.name}</h3>
      {album.artistName && (
        <p className={styles.publicProfilePage__albumArtist}>{album.artistName}</p>
      )}
      <p className={styles.publicProfilePage__albumMeta}>
        {album.playCount} reproducciones
      </p>
    </Link>
  );
}

interface TrackItemProps {
  track: TopTrack;
  index: number;
}

function TrackItem({ track, index }: TrackItemProps) {
  return (
    <Link
      href={track.albumId ? `/album/${track.albumId}` : '#'}
      className={styles.publicProfilePage__trackItem}
    >
      <span className={styles.publicProfilePage__trackNumber}>{index + 1}</span>
      {track.coverUrl ? (
        <img
          src={track.coverUrl}
          alt={track.title}
          className={styles.publicProfilePage__trackCover}
        />
      ) : (
        <div className={styles.publicProfilePage__trackCoverPlaceholder}>
          <Music size={18} />
        </div>
      )}
      <div className={styles.publicProfilePage__trackInfo}>
        <h3 className={styles.publicProfilePage__trackTitle}>{track.title}</h3>
        {track.artistName && (
          <p className={styles.publicProfilePage__trackArtist}>{track.artistName}</p>
        )}
      </div>
      <span className={styles.publicProfilePage__trackPlays}>
        {formatPlayCount(track.playCount)}
      </span>
    </Link>
  );
}

interface PlaylistCardProps {
  playlist: PublicPlaylist;
}

function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Link href={`/playlists/${playlist.id}`} className={styles.publicProfilePage__playlistCard}>
      <div className={styles.publicProfilePage__playlistCoverWrapper}>
        <PlaylistCoverMosaic albumIds={playlist.albumIds} playlistName={playlist.name} />
      </div>
      <h3 className={styles.publicProfilePage__playlistName}>{playlist.name}</h3>
      <p className={styles.publicProfilePage__playlistMeta}>
        {playlist.songCount} canciones · {formatDuration(playlist.duration)}
      </p>
    </Link>
  );
}

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

  // Compute hero color based on top album
  const heroColor = useMemo(() => {
    const topAlbumCover = profile?.topAlbums?.[0]?.coverUrl;
    return getHeroColor(topAlbumCover);
  }, [profile?.topAlbums]);

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
              style={{ '--hero-color': heroColor } as HeroColorStyle}
            >
              <div className={styles.publicProfilePage__heroGradient} />
              <div className={styles.publicProfilePage__heroContent}>
                <Avatar
                  avatarUrl={user.avatarUrl}
                  name={user.name}
                  username={user.username}
                />
                <div className={styles.publicProfilePage__heroInfo}>
                  <span className={styles.publicProfilePage__profileLabel}>Perfil</span>
                  <h1 className={styles.publicProfilePage__name}>
                    {user.name || user.username}
                  </h1>
                </div>
              </div>
            </div>

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
            style={{ '--hero-color': heroColor } as HeroColorStyle}
          >
            <div className={styles.publicProfilePage__heroGradient} />
            <div className={styles.publicProfilePage__heroContent}>
              <Avatar
                avatarUrl={user.avatarUrl}
                name={user.name}
                username={user.username}
              />
              <div className={styles.publicProfilePage__heroInfo}>
                <span className={styles.publicProfilePage__profileLabel}>Perfil</span>
                <h1 className={styles.publicProfilePage__name}>
                  {user.name || user.username}
                </h1>

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
                {user.bio && (
                  <p className={styles.publicProfilePage__bio}>{user.bio}</p>
                )}
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
            {/* Top Artists */}
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

            {/* Top Albums */}
            {settings.showTopAlbums && topAlbums && topAlbums.length > 0 && (
              <section className={styles.publicProfilePage__section}>
                <div className={styles.publicProfilePage__sectionHeader}>
                  <h2 className={styles.publicProfilePage__sectionTitle}>
                    Álbumes más escuchados
                  </h2>
                </div>
                <div className={styles.publicProfilePage__albumsGrid}>
                  {topAlbums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              </section>
            )}

            {/* Top Tracks */}
            {settings.showTopTracks && topTracks && topTracks.length > 0 && (
              <section className={styles.publicProfilePage__section}>
                <div className={styles.publicProfilePage__sectionHeader}>
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

            {/* Playlists */}
            {settings.showPlaylists && playlists && playlists.length > 0 && (
              <section className={styles.publicProfilePage__section}>
                <div className={styles.publicProfilePage__sectionHeader}>
                  <h2 className={styles.publicProfilePage__sectionTitle}>
                    Playlists públicas
                  </h2>
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
