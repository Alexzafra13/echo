import { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { Play, Shuffle, Disc3, Music2, Gauge, Trash2 } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { usePlayer } from '@features/player';
import { Button } from '@shared/components/ui';
import { PlaylistCoverMosaic } from '@features/playlists/components';
import { useDjSession, useDeleteDjSession, useRemoveTrackFromDjSession } from '../../hooks/useDjSessions';
import { formatBpm, formatKey, getCamelotColor } from '../../hooks/useDjFlow';
import { extractDominantColor } from '@shared/utils/colorExtractor';
import { formatDuration } from '@shared/utils/format';
import { logger } from '@shared/utils/logger';
import type { DjSessionTrack } from '../../services/djSessions.service';
import styles from './DjSessionDetailPage.module.css';

/**
 * DjSessionDetailPage Component
 * Displays DJ session details with harmonic mix info
 */
export default function DjSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { playQueue, currentTrack, setShuffle } = usePlayer();
  const [dominantColor, setDominantColor] = useState<string>('10, 14, 39');

  const { data: session, isLoading, error } = useDjSession(id!);
  const deleteSessionMutation = useDeleteDjSession();
  const removeTrackMutation = useRemoveTrackFromDjSession();

  // Extract dominant color from first album cover
  useEffect(() => {
    const tracks = session?.tracks || [];
    const firstAlbumId = tracks.find((track) => track.albumId)?.albumId;

    if (firstAlbumId) {
      const coverUrl = `/api/albums/${firstAlbumId}/cover`;
      extractDominantColor(coverUrl)
        .then((color) => setDominantColor(color))
        .catch(() => {/* Color extraction failed, use default */});
    }
  }, [session]);

  const handlePlayAll = useCallback(() => {
    const tracks = session?.tracks || [];
    if (tracks.length === 0) return;
    setShuffle(false);
    const playerTracks = tracks.map(t => ({
      id: t.trackId,
      title: t.title || 'Unknown',
      artist: t.artist || 'Unknown',
      albumId: t.albumId,
      duration: t.duration,
      coverImage: t.albumId ? `/api/images/albums/${t.albumId}/cover` : undefined,
    }));
    playQueue(playerTracks, 0);
  }, [session, playQueue, setShuffle]);

  const handleShufflePlay = useCallback(() => {
    const tracks = session?.tracks || [];
    if (tracks.length === 0) return;
    const playerTracks = tracks.map(t => ({
      id: t.trackId,
      title: t.title || 'Unknown',
      artist: t.artist || 'Unknown',
      albumId: t.albumId,
      duration: t.duration,
      coverImage: t.albumId ? `/api/images/albums/${t.albumId}/cover` : undefined,
    }));
    setShuffle(true);
    // Fisher-Yates shuffle
    const shuffled = [...playerTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playQueue(shuffled, 0);
  }, [session, playQueue, setShuffle]);

  const handleTrackPlay = useCallback((_track: DjSessionTrack, index: number) => {
    const tracks = session?.tracks || [];
    if (tracks.length === 0) return;
    const playerTracks = tracks.map(t => ({
      id: t.trackId,
      title: t.title || 'Unknown',
      artist: t.artist || 'Unknown',
      albumId: t.albumId,
      duration: t.duration,
      coverImage: t.albumId ? `/api/images/albums/${t.albumId}/cover` : undefined,
    }));
    playQueue(playerTracks, index);
  }, [session, playQueue]);

  const handleDeleteSession = async () => {
    if (!id || !confirm('¿Eliminar esta sesión DJ?')) return;
    try {
      await deleteSessionMutation.mutateAsync(id);
      setLocation('/playlists?mode=dj');
    } catch (error) {
      logger.error('Error deleting DJ session:', error);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!id) return;
    try {
      await removeTrackMutation.mutateAsync({ sessionId: id, trackId });
    } catch (error) {
      logger.error('Error removing track from session:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.djSessionDetailPage}>
        <Sidebar />
        <main className={styles.djSessionDetailPage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.djSessionDetailPage__content}>
            <div className={styles.djSessionDetailPage__loadingState}>
              <p>Cargando sesión DJ...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={styles.djSessionDetailPage}>
        <Sidebar />
        <main className={styles.djSessionDetailPage__main}>
          <Header showBackButton disableSearch />
          <div className={styles.djSessionDetailPage__content}>
            <div className={styles.djSessionDetailPage__errorState}>
              <p>Error al cargar la sesión DJ</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const tracks = session.tracks || [];
  const albumIds = [...new Set(tracks.map(t => t.albumId).filter(Boolean))] as string[];

  // Calculate BPM range
  const bpms = tracks.map(t => t.bpm).filter(Boolean) as number[];
  const bpmRange = bpms.length > 0
    ? bpms.length === 1
      ? `${Math.round(bpms[0])} BPM`
      : `${Math.round(Math.min(...bpms))}-${Math.round(Math.max(...bpms))} BPM`
    : null;

  // Calculate average compatibility score
  const scores = tracks.map(t => t.compatibilityScore).filter(Boolean) as number[];
  const avgCompatibility = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  return (
    <div className={styles.djSessionDetailPage}>
      <Sidebar />

      <main className={styles.djSessionDetailPage__main}>
        <Header showBackButton disableSearch />

        <div
          className={styles.djSessionDetailPage__content}
          style={{
            background: `linear-gradient(180deg,
              rgba(${dominantColor}, 0.6) 0%,
              rgba(${dominantColor}, 0.3) 25%,
              rgba(10, 14, 39, 1) 60%)`
          }}
        >
          {/* Session hero section */}
          <div className={styles.djSessionDetailPage__hero}>
            {/* Session cover */}
            <div className={styles.djSessionDetailPage__heroCover}>
              {albumIds.length > 0 ? (
                <PlaylistCoverMosaic albumIds={albumIds} playlistName={session.name} />
              ) : (
                <div className={styles.djSessionDetailPage__heroCoverPlaceholder}>
                  <Disc3 size={80} />
                </div>
              )}
              <div className={styles.djSessionDetailPage__djBadge}>
                <Disc3 size={14} />
                DJ Session
              </div>
            </div>

            {/* Session info */}
            <div className={styles.djSessionDetailPage__heroInfo}>
              <span className={styles.djSessionDetailPage__heroType}>Sesión DJ</span>
              <h1 className={styles.djSessionDetailPage__heroTitle}>{session.name}</h1>

              <div className={styles.djSessionDetailPage__heroMeta}>
                <span>{session.trackCount} {session.trackCount === 1 ? 'track' : 'tracks'}</span>
                {session.totalDuration && session.totalDuration > 0 && (
                  <>
                    <span className={styles.djSessionDetailPage__heroDivider}>•</span>
                    <span>{formatDuration(session.totalDuration)}</span>
                  </>
                )}
                {bpmRange && (
                  <>
                    <span className={styles.djSessionDetailPage__heroDivider}>•</span>
                    <span>{bpmRange}</span>
                  </>
                )}
              </div>

              {/* DJ Stats */}
              <div className={styles.djSessionDetailPage__djStats}>
                {avgCompatibility !== null && (
                  <div className={styles.djSessionDetailPage__stat}>
                    <span className={styles.djSessionDetailPage__statLabel}>Compatibilidad</span>
                    <span className={styles.djSessionDetailPage__statValue}>{avgCompatibility}%</span>
                  </div>
                )}
                <div className={styles.djSessionDetailPage__stat}>
                  <span className={styles.djSessionDetailPage__statLabel}>Transición</span>
                  <span className={styles.djSessionDetailPage__statValue}>
                    {session.transitionType || 'crossfade'} ({session.transitionDuration || 5}s)
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className={styles.djSessionDetailPage__heroActions}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePlayAll}
                  leftIcon={<Play size={20} fill="currentColor" />}
                  disabled={tracks.length === 0}
                >
                  Reproducir
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleShufflePlay}
                  leftIcon={<Shuffle size={20} />}
                  disabled={tracks.length === 0}
                >
                  Aleatorio
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleDeleteSession}
                  leftIcon={<Trash2 size={20} />}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>

          {/* Track listing with DJ info */}
          <div className={styles.djSessionDetailPage__trackSection}>
            {tracks.length > 0 ? (
              <div className={styles.djSessionDetailPage__trackList}>
                {/* Header */}
                <div className={styles.djSessionDetailPage__trackHeader}>
                  <span className={styles.djSessionDetailPage__headerNumber}>#</span>
                  <span className={styles.djSessionDetailPage__headerTitle}>Título</span>
                  <span className={styles.djSessionDetailPage__headerKey}>Key</span>
                  <span className={styles.djSessionDetailPage__headerBpm}>BPM</span>
                  <span className={styles.djSessionDetailPage__headerEnergy}>Energy</span>
                  <span className={styles.djSessionDetailPage__headerCompat}>Match</span>
                  <span className={styles.djSessionDetailPage__headerDuration}>Duración</span>
                  <span className={styles.djSessionDetailPage__headerActions}></span>
                </div>

                {/* Tracks */}
                {tracks.map((track, index) => {
                  const isCurrentTrack = currentTrack?.id === track.trackId;
                  const keyColor = getCamelotColor(track.camelotKey);
                  const coverUrl = track.albumId ? `/api/albums/${track.albumId}/cover` : '/placeholder-album.png';

                  return (
                    <div
                      key={track.trackId}
                      className={`${styles.djSessionDetailPage__track} ${isCurrentTrack ? styles['djSessionDetailPage__track--active'] : ''}`}
                      onClick={() => handleTrackPlay(track, index)}
                    >
                      <div className={styles.djSessionDetailPage__trackNumber}>
                        {index > 0 && track.compatibilityScore && (
                          <div
                            className={styles.djSessionDetailPage__compatLine}
                            style={{
                              '--compat-color': track.compatibilityScore >= 80 ? '#22c55e' : track.compatibilityScore >= 60 ? '#eab308' : '#ef4444'
                            } as React.CSSProperties}
                          />
                        )}
                        <span>{track.order || index + 1}</span>
                      </div>

                      <div className={styles.djSessionDetailPage__trackInfo}>
                        <img
                          src={coverUrl}
                          alt={track.title || 'Track'}
                          className={styles.djSessionDetailPage__trackCover}
                          onError={(e) => { e.currentTarget.src = '/placeholder-album.png'; }}
                        />
                        <div className={styles.djSessionDetailPage__trackText}>
                          <span className={styles.djSessionDetailPage__trackTitle}>{track.title || 'Unknown'}</span>
                          <span className={styles.djSessionDetailPage__trackArtist}>{track.artist || 'Unknown Artist'}</span>
                        </div>
                      </div>

                      <div className={styles.djSessionDetailPage__trackKey} style={{ color: keyColor }}>
                        <Music2 size={14} />
                        {formatKey(track.camelotKey)}
                      </div>

                      <div className={styles.djSessionDetailPage__trackBpm}>
                        <Gauge size={14} />
                        {formatBpm(track.bpm)}
                      </div>

                      <div className={styles.djSessionDetailPage__trackEnergy}>
                        {track.energy !== undefined && track.energy !== null ? (
                          <div className={styles.djSessionDetailPage__energyBar}>
                            <div
                              className={styles.djSessionDetailPage__energyFill}
                              style={{ width: `${track.energy * 100}%` }}
                            />
                          </div>
                        ) : (
                          <span className={styles.djSessionDetailPage__noData}>-</span>
                        )}
                      </div>

                      <div className={styles.djSessionDetailPage__trackCompat}>
                        {track.compatibilityScore !== undefined && track.compatibilityScore !== null ? (
                          <span
                            className={styles.djSessionDetailPage__compatBadge}
                            style={{
                              '--compat-color': track.compatibilityScore >= 80 ? '#22c55e' : track.compatibilityScore >= 60 ? '#eab308' : '#ef4444'
                            } as React.CSSProperties}
                          >
                            {track.compatibilityScore}%
                          </span>
                        ) : (
                          <span className={styles.djSessionDetailPage__noData}>-</span>
                        )}
                      </div>

                      <div className={styles.djSessionDetailPage__trackDuration}>
                        {track.duration ? formatDuration(track.duration) : '-'}
                      </div>

                      <div className={styles.djSessionDetailPage__trackActions}>
                        <button
                          className={styles.djSessionDetailPage__removeButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTrack(track.trackId);
                          }}
                          title="Eliminar de la sesión"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.djSessionDetailPage__emptyTracks}>
                <Disc3 size={48} />
                <p>Esta sesión está vacía</p>
                <p className={styles.djSessionDetailPage__emptyHint}>
                  Añade tracks desde el menú de opciones de cualquier canción
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
