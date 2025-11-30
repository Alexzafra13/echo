import { useState, useCallback } from 'react';
import { usePlayer } from '@features/player';
import { tracksService } from '@features/home/services/tracks.service';
import type { Track } from '@shared/types/track.types';

export interface UseShufflePlayReturn {
  /** Execute shuffle play for entire library */
  shufflePlay: () => Promise<void>;
  /** Loading state while fetching tracks */
  isLoading: boolean;
}

/**
 * Hook for playing the entire library in shuffle mode
 * Fetches all tracks in random order and starts playback
 */
export function useShufflePlay(): UseShufflePlayReturn {
  const { playQueue, isShuffle, toggleShuffle } = usePlayer();
  const [isLoading, setIsLoading] = useState(false);

  const shufflePlay = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { data: shuffledTracks } = await tracksService.getShuffled();

      if (shuffledTracks.length === 0) {
        return;
      }

      // Convert to player format
      const playerTracks: Track[] = shuffledTracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artistName || 'Artista desconocido',
        artistId: track.artistId,
        albumId: track.albumId,
        albumName: track.albumName,
        duration: track.duration,
        coverImage: track.albumId ? `/api/images/albums/${track.albumId}/cover` : undefined,
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
      }));

      // Enable shuffle mode if not already enabled
      if (!isShuffle) {
        toggleShuffle();
      }

      playQueue(playerTracks, 0);
    } catch (error) {
      console.error('Error loading shuffled tracks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isShuffle, toggleShuffle, playQueue]);

  return { shufflePlay, isLoading };
}
