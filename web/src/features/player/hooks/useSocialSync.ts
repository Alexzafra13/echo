import { useEffect } from 'react';
import { updatePlaybackState } from '@shared/services/play-tracking.service';
import type { FederationTrackData } from '@shared/services/play-tracking.service';
import { useAuthStore } from '@shared/store';
import { logger } from '@shared/utils/logger';
import type { Track } from '@shared/types/track.types';

interface UseSocialSyncProps {
  isPlaying: boolean;
  currentTrack: Track | null;
  isRadioMode: boolean;
}

/**
 * Detect if a track is from a federated server by checking its streamUrl.
 * Federated tracks have streamUrl like: /federation/servers/{serverId}/tracks/{trackId}/stream
 */
function getFederationInfo(track: Track): FederationTrackData | null {
  if (!track.streamUrl?.includes('/federation/servers/')) return null;

  const match = track.streamUrl.match(/\/federation\/servers\/([^/]+)\//);
  if (!match) return null;

  return {
    title: track.title,
    artistName: track.artistName || track.artist || '',
    albumName: track.albumName || '',
    coverUrl: track.coverImage || null,
    serverId: match[1],
  };
}

/**
 * Hook to sync playback state with the backend for social features ("Listening Now").
 * Allows friends to see what you're currently playing.
 */
export function useSocialSync({ isPlaying, currentTrack, isRadioMode }: UseSocialSyncProps): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isRadioMode || !isAuthenticated) return;

    const federationTrack = currentTrack && isPlaying ? getFederationInfo(currentTrack) : null;

    // Send playback state to backend (fire and forget)
    updatePlaybackState({
      isPlaying,
      currentTrackId: isPlaying && currentTrack?.id ? currentTrack.id : null,
      federationTrack,
    }).catch((err) => {
      logger.debug('[SocialSync] Failed to sync playback state:', err);
    });
  }, [isPlaying, currentTrack, isRadioMode, isAuthenticated]);
}
