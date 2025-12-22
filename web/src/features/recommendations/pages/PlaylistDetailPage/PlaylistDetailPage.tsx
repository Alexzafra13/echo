import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Play, Shuffle } from 'lucide-react';
import { z } from 'zod';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { TrackList } from '@features/home/components/TrackList';
import { Button } from '@shared/components/ui';
import { usePlayer } from '@features/player/context/PlayerContext';
import { formatDuration } from '@shared/utils/format';
import { PlaylistCover } from '../../components/PlaylistCover';
import { useArtistImages, getArtistImageUrl } from '@features/home/hooks';
import { useArtist } from '@features/artists/hooks';
import type { AutoPlaylist } from '@shared/services/recommendations.service';
import type { Track as HomeTrack } from '@features/home/types';
import type { Track as PlayerTrack } from '@features/player/types';
import { logger } from '@shared/utils/logger';
import styles from './PlaylistDetailPage.module.css';

// Zod schema for validating playlist data from sessionStorage
// Using passthrough() to allow additional fields from API that aren't explicitly defined
const AutoPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['wave-mix', 'artist', 'genre', 'mood']),
  coverColor: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  metadata: z.object({
    totalTracks: z.number(),
    avgScore: z.number(),
    artistName: z.string().optional().nullable(),
    artistId: z.string().optional().nullable(),
    genreName: z.string().optional().nullable(),
    // Allow additional metadata fields (topGenres, topArtists, temporalDistribution, etc.)
  }).passthrough(),
  tracks: z.array(z.object({
    // Support both 'score' and 'totalScore' field names from API
    score: z.number().optional(),
    totalScore: z.number().optional(),
    trackId: z.string().optional(),
    rank: z.number().optional(),
    track: z.object({
      id: z.string(),
      title: z.string(),
      artistName: z.string().optional().nullable(),
      albumName: z.string().optional().nullable(),
      albumId: z.string().optional().nullable(),
      artistId: z.string().optional().nullable(),
      duration: z.number().optional().nullable(),
    }).passthrough().optional().nullable(),
    // Allow additional track fields (breakdown, album, etc.)
  }).passthrough()),
  // Allow additional playlist fields (userId, createdAt, expiresAt, etc.)
}).passthrough();

/**
 * PlaylistDetailPage Component
 * Displays individual playlist with tracks
 */
export function PlaylistDetailPage() {
  const [_match, _params] = useRoute('/wave-mix/:id');
  const [, setLocation] = useLocation();
  const { playQueue, currentTrack, setShuffle } = usePlayer();
  const [playlist, setPlaylist] = useState<AutoPlaylist | null>(null);

  // For artist playlists, get artist images for the background
  const artistId = playlist?.type === 'artist' ? playlist.metadata.artistId : undefined;
  const { data: artistImages } = useArtistImages(artistId);
  const { data: artist } = useArtist(artistId);

  useEffect(() => {
    // Get playlist from sessionStorage
    const storedPlaylist = sessionStorage.getItem('currentPlaylist');
    if (storedPlaylist) {
      try {
        const parsedData = JSON.parse(storedPlaylist);
        // Validate with Zod schema for type safety
        const validatedPlaylist = AutoPlaylistSchema.parse(parsedData);
        // Use double assertion since passthrough() returns a wider type
        setPlaylist(validatedPlaylist as unknown as AutoPlaylist);
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
    // Disable shuffle mode for ordered playback
    setShuffle(false);
    const tracks = convertToPlayerTracks(playlist);
    playQueue(tracks);
  };

  const handleShufflePlay = () => {
    try {
      // Debug: first line to verify function is being called
      console.log('[PlaylistDetail] handleShufflePlay called');

      if (!playlist || playlist.tracks.length === 0) {
        logger.warn('[PlaylistDetail] No playlist or empty tracks', { playlist: !!playlist, tracksLength: playlist?.tracks?.length });
        return;
      }

      const playerTracks = convertToPlayerTracks(playlist);
      console.log('[PlaylistDetail] Converted tracks:', playerTracks.length);

      if (playerTracks.length === 0) {
        logger.warn('[PlaylistDetail] No tracks after conversion');
        return;
      }

      // Enable shuffle mode
      setShuffle(true);

      // Shuffle the tracks array using Fisher-Yates algorithm
      const shuffledTracks = [...playerTracks];
      for (let i = shuffledTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
      }

      console.log('[PlaylistDetail] Playing shuffled queue:', shuffledTracks.length, 'tracks');
      playQueue(shuffledTracks, 0);
    } catch (error) {
      console.error('[PlaylistDetail] Error in handleShufflePlay:', error);
    }
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
        albumId: st.track!.albumId,
        albumName: st.track!.albumName,
        duration: st.track!.duration || 0,
        coverImage: st.track!.albumId ? `/api/albums/${st.track!.albumId}/cover` : undefined,
        // Audio normalization data (LUFS)
        rgTrackGain: (st.track as any)?.rgTrackGain,
        rgTrackPeak: (st.track as any)?.rgTrackPeak,
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

  // Get background image for artist playlists
  const getBackgroundUrl = (): string | null => {
    if (playlist?.type !== 'artist' || !artistId) return null;

    const hasBackground = artistImages?.images.background?.exists;
    const hasBanner = artistImages?.images.banner?.exists;

    if (!hasBackground && !hasBanner) {
      // Fallback to coverImageUrl if no artist background
      return playlist.coverImageUrl || null;
    }

    // Use the most recently updated image
    const bgModified = artistImages?.images.background?.lastModified;
    const bannerModified = artistImages?.images.banner?.lastModified;

    let imageType: 'background' | 'banner' = 'background';
    if (!hasBackground) {
      imageType = 'banner';
    } else if (hasBanner && bannerModified && bgModified) {
      imageType = new Date(bgModified) >= new Date(bannerModified) ? 'background' : 'banner';
    }

    const tag = imageType === 'background'
      ? artistImages?.images.background?.tag
      : artistImages?.images.banner?.tag;

    return getArtistImageUrl(artistId, imageType, tag);
  };

  if (!playlist) {
    return null;
  }

  const tracks = convertToHomeTracks(playlist);
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const isArtistPlaylist = playlist.type === 'artist';
  const backgroundUrl = getBackgroundUrl();

  // Get background position from artist data if available
  const backgroundPosition = artist?.backgroundPosition || 'center top';

  return (
    <div className={styles.playlistDetailPage}>
      <Sidebar />

      <main className={styles.playlistDetailPage__main}>
        <Header showBackButton disableSearch />

        <div className={styles.playlistDetailPage__content}>
          {/* Hero Section */}
          <div className={`${styles.playlistDetailPage__hero} ${isArtistPlaylist ? styles['playlistDetailPage__hero--artist'] : ''}`}>
            {/* Background for artist playlists */}
            {isArtistPlaylist && backgroundUrl && (
              <div
                className={styles.playlistDetailPage__background}
                style={{
                  backgroundImage: `url(${backgroundUrl})`,
                  backgroundPosition: backgroundPosition,
                }}
              />
            )}

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
                  {playlist.type === 'wave-mix' && 'Playlist Personalizada'}
                  {playlist.type === 'artist' && 'Playlist de Artista'}
                  {playlist.type === 'genre' && 'Playlist de Género'}
                  {playlist.type === 'mood' && 'Playlist de Estado de Ánimo'}
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
            >
              <Play size={20} fill="currentColor" />
              Reproducir
            </Button>
            <Button
              variant="secondary"
              onClick={handleShufflePlay}
              disabled={tracks.length === 0}
            >
              <Shuffle size={20} />
              Aleatorio
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
