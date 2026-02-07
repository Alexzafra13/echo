import { useEffect } from 'react';
import { updatePlaybackState } from '@shared/services/play-tracking.service';
import { useAuthStore } from '@shared/store';

interface UseSocialSyncProps {
  isPlaying: boolean;
  currentTrackId: string | null;
  isRadioMode: boolean;
}

/**
 * Hook to sync playback state with the backend for social features ("Listening Now").
 * Allows friends to see what you're currently playing.
 */
export function useSocialSync({
  isPlaying,
  currentTrackId,
  isRadioMode,
}: UseSocialSyncProps): void {
  useEffect(() => {
    // Only sync for track playback (not radio)
    if (isRadioMode) return;

    // Check if user is authenticated before syncing
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) return;

    // Send playback state to backend (fire and forget)
    updatePlaybackState({
      isPlaying,
      currentTrackId: isPlaying && currentTrackId ? currentTrackId : null,
    }).catch(() => {
      // Silently ignore sync failures - non-critical feature
    });
  }, [isPlaying, currentTrackId, isRadioMode]);
}
