import { useState, useEffect, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Play } from 'lucide-react';
import { z } from 'zod';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { TrackList } from '@features/home/components/TrackList';
import { Button } from '@shared/components/ui';
import { usePlayer } from '@features/player/context/PlayerContext';
import { formatDuration } from '@shared/utils/format';
import { PlaylistCover } from '../../components/PlaylistCover';
import type { AutoPlaylist } from '@shared/services/recommendations.service';
import type { Track as HomeTrack } from '@features/home/types';
import type { Track as PlayerTrack } from '@features/player/types';
import { logger } from '@shared/utils/logger';
import styles from './PlaylistDetailPage.module.css';

// Zod schema for validating playlist data from sessionStorage
const AutoPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['wave-mix', 'artist-playlist', 'genre-playlist', 'daily-mix']),
  coverColor: z.string().optional(),
  coverImageUrl: z.string().optional(),
  metadata: z.object({
    totalTracks: z.number(),
    avgScore: z.number(),
    artistName: z.string().optional(),
    genreName: z.string().optional(),
  }),
  tracks: z.array(z.object({
    score: z.number().optional(),
    track: z.object({
      id: z.string(),
      title: z.string(),
      artistName: z.string().optional(),
      albumName: z.string().optional(),
      albumId: z.string().optional(),
      artistId: z.string().optional(),
      duration: z.number().optional(),
    }).optional(),
  })),
});

/**
 * PlaylistDetailPage Component
 * Displays individual playlist with tracks
 */
export function PlaylistDetailPage() {
  const [_match, _params] = useRoute('/wave-mix/:id');
  const [, setLocation] = useLocation();
  const { playQueue, currentTrack } = usePlayer();
  const [playlist, setPlaylist] = useState<AutoPlaylist | null>(null);

  useEffect(() => {
    // Get playlist from sessionStorage
    const storedPlaylist = sessionStorage.getItem('currentPlaylist');
    if (storedPlaylist) {
      try {
        const parsedData = JSON.parse(storedPlaylist);
        // Validate with Zod schema for type safety
        const validatedPlaylist = AutoPlaylistSchema.parse(parsedData);
        setPlaylist(validatedPlaylist as AutoPlaylist);
      } catch (error) {
        logger.error('Failed to parse or validate playlist from sessionStorage', error);
        setLocation('/wave-mix');
      }
    } else {
      // If no playlist in storage, redirect back to Wave Mix page
      setLocation('/wave-mix');
    }
  }, [setLocation]);

  const handlePlayAll = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    const tracks = convertToPlayerTracks(playlist);
    playQueue(tracks);
  };

  const handlePlayTrack = (track: HomeTrack) => {
    if (!playlist) return;
    const tracks = convertToPlayerTracks(playlist);
    const index = tracks.findIndex((t) => t.id === track.id);
    playQueue(tracks, index);
  };

  // Convert to Player Tracks (for playback)
  const convertToPlayerTracks = (playlist: AutoPlaylist): PlayerTrack[] => {
    return playlist.tracks
      .filter((st) => st.track)
      .map((st) => ({
        id: st.track!.id,
        title: st.track!.title,
        artist: st.track!.artistName || 'Unknown Artist',
        albumName: st.track!.albumName,
        duration: st.track!.duration || 0,
        coverImage: st.track!.albumId ? `/api/albums/${st.track!.albumId}/cover` : undefined,
      }));
  };

  // Convert to Home Tracks (for display in TrackList)
  const convertToHomeTracks = (playlist: AutoPlaylist): HomeTrack[] => {
    return playlist.tracks
      .filter((st) => st.track)
      .map((st) => ({
        id: st.track!.id,
        title: st.track!.title,
        artistName: st.track!.artistName || 'Unknown Artist',
        albumName: st.track!.albumName,
        albumId: st.track!.albumId,
        artistId: st.track!.artistId,
        duration: st.track!.duration || 0,
        path: '',
        discNumber: 1,
        compilation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
  };

  if (!playlist) {
    return null;
  }

  const tracks = convertToHomeTracks(playlist);
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

  return (
    <div className={styles.playlistDetailPage}>
      <Sidebar />

      <main className={styles.playlistDetailPage__main}>
        <Header showBackButton disableSearch />

        <div className={styles.playlistDetailPage__content}>
          {/* Hero Section */}
          <div className={styles.playlistDetailPage__hero}>
            <div className={styles.playlistDetailPage__heroContent}>
              <PlaylistCover
                type={playlist.type}
                name={playlist.name}
                coverColor={playlist.coverColor}
                coverImageUrl={playlist.coverImageUrl}
                artistName={playlist.metadata.artistName}
                size="large"
                className={styles.playlistCover}
              />
              <div className={styles.playlistDetailPage__info}>
                <p className={styles.playlistType}>
                  {playlist.type === 'wave-mix' ? 'Playlist Personalizada' : 'Playlist de Artista'}
                </p>
                <h1 className={styles.playlistName}>{playlist.name}</h1>
                <p className={styles.playlistDescription}>{playlist.description}</p>
                <div className={styles.playlistMeta}>
                  <span>{playlist.metadata.totalTracks} canciones</span>
                  <span className={styles.separator}>•</span>
                  <span>{formatDuration(totalDuration)}</span>
                  {playlist.metadata.avgScore > 0 && (
                    <>
                      <span className={styles.separator}>•</span>
                      <span>Puntuación: {playlist.metadata.avgScore.toFixed(1)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.playlistDetailPage__actions}>
            <Button
              variant="primary"
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className={styles.playButton}
            >
              <Play size={20} fill="currentColor" />
              Reproducir todo
            </Button>
          </div>

          {/* Track List */}
          {tracks.length > 0 && (
            <div className={styles.playlistDetailPage__tracks}>
              <TrackList
                tracks={tracks}
                onTrackPlay={handlePlayTrack}
                currentTrackId={currentTrack?.id}
              />
            </div>
          )}

          {tracks.length === 0 && (
            <div className={styles.emptyState}>
              <p>No hay canciones en esta playlist</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
