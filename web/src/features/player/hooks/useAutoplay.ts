import { useCallback, useRef } from 'react';
import { artistsService } from '@features/artists/services/artists.service';
import { getSmartPlaylistByArtist } from '@shared/services/recommendations.service';
import type { Track } from '@shared/types/track.types';
import { logger } from '@shared/utils/logger';

const AUTOPLAY_BATCH_SIZE = 20; // Tracks to load per autoplay trigger
const MAX_ARTISTS_TO_TRY = 5; // Max similar artists to try if first ones have no tracks

interface AutoplayState {
  loading: boolean;
  lastArtistId: string | null;
  // Track IDs already played in this autoplay session to avoid repeats
  playedTrackIds: Set<string>;
}

/**
 * Hook for autoplay functionality
 * Loads tracks from similar artists when queue ends
 */
export function useAutoplay() {
  const stateRef = useRef<AutoplayState>({
    loading: false,
    lastArtistId: null,
    playedTrackIds: new Set(),
  });

  /**
   * Convert recommendation track to player track format
   */
  const convertToPlayerTrack = useCallback((track: {
    id: string;
    title: string;
    artistName?: string;
    albumName?: string;
    duration?: number;
    albumId?: string;
    artistId?: string;
  }): Track => {
    return {
      id: track.id,
      title: track.title,
      artist: track.artistName || 'Artista desconocido',
      artistId: track.artistId,
      albumId: track.albumId,
      albumName: track.albumName,
      duration: track.duration,
      coverImage: track.albumId ? `/api/images/albums/${track.albumId}/cover` : undefined,
    };
  }, []);

  /**
   * Load tracks from similar artists
   * @param currentArtistId - The artist ID of the last played track
   * @param excludeTrackIds - Track IDs to exclude (already in queue or played)
   * @returns Array of tracks from similar artists
   */
  const loadSimilarArtistTracks = useCallback(async (
    currentArtistId: string,
    excludeTrackIds: Set<string> = new Set()
  ): Promise<{ tracks: Track[]; sourceArtistName: string | null }> => {
    const state = stateRef.current;

    if (state.loading) {
      return { tracks: [], sourceArtistName: null };
    }

    state.loading = true;

    try {
      // 1. Get related artists
      logger.debug('[Autoplay] Fetching related artists for:', currentArtistId);
      const relatedResponse = await artistsService.getRelatedArtists(currentArtistId, MAX_ARTISTS_TO_TRY);

      if (!relatedResponse.data || relatedResponse.data.length === 0) {
        logger.info('[Autoplay] No related artists found for artist:', currentArtistId);
        return { tracks: [], sourceArtistName: null };
      }

      logger.debug(`[Autoplay] Found ${relatedResponse.data.length} related artists`);

      // 2. Try to get tracks from similar artists (in order of match score)
      const allExcluded = new Set([...excludeTrackIds, ...state.playedTrackIds]);
      const newTracks: Track[] = [];
      let sourceArtistName: string | null = null;

      for (const relatedArtist of relatedResponse.data) {
        if (newTracks.length >= AUTOPLAY_BATCH_SIZE) break;

        try {
          // Get smart playlist for this artist
          const playlist = await getSmartPlaylistByArtist(
            relatedArtist.id,
            AUTOPLAY_BATCH_SIZE - newTracks.length
          );

          if (playlist.tracks && playlist.tracks.length > 0) {
            // Filter out already played tracks
            const freshTracks = playlist.tracks
              .filter(t => t.track && !allExcluded.has(t.track.id))
              .map(t => convertToPlayerTrack(t.track!));

            if (freshTracks.length > 0) {
              newTracks.push(...freshTracks);
              if (!sourceArtistName) {
                sourceArtistName = relatedArtist.name;
              }

              // Mark these tracks as played
              freshTracks.forEach(t => {
                state.playedTrackIds.add(t.id);
                allExcluded.add(t.id);
              });

              logger.debug(`[Autoplay] Added ${freshTracks.length} tracks from ${relatedArtist.name}`);
            }
          }
        } catch (err) {
          logger.warn(`[Autoplay] Failed to get tracks for ${relatedArtist.name}:`, err);
          // Continue with next artist
        }
      }

      state.lastArtistId = currentArtistId;

      return { tracks: newTracks, sourceArtistName };
    } catch (error) {
      logger.error('[Autoplay] Error loading similar artist tracks:', error);
      return { tracks: [], sourceArtistName: null };
    } finally {
      state.loading = false;
    }
  }, [convertToPlayerTrack]);

  /**
   * Reset autoplay session (call when user starts new playback)
   */
  const resetSession = useCallback(() => {
    stateRef.current.playedTrackIds.clear();
    stateRef.current.lastArtistId = null;
  }, []);

  /**
   * Check if autoplay is currently loading
   */
  const isLoading = useCallback(() => {
    return stateRef.current.loading;
  }, []);

  return {
    loadSimilarArtistTracks,
    resetSession,
    isLoading,
  };
}
