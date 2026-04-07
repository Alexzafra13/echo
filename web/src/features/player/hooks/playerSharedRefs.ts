/**
 * Shared refs used for cross-hook communication in the player.
 *
 * These refs exist because several hooks need to share mutable state
 * without triggering React re-renders or causing circular dependencies.
 * They are created in PlayerContext and passed to hooks via this single
 * interface, reducing the parameter surface from ~8 scattered refs to 1 object.
 */

import type { Track, PlayContext } from '../types';

export interface PreloadedTrack {
  trackId: string;
  nextIndex: number;
  track: Track;
}

export interface PlayerSharedRefs {
  /** True during async transitions to suppress spurious pause events */
  isTransitioningRef: React.MutableRefObject<boolean>;
  /** Next track preloaded on the inactive audio element for gapless playback */
  preloadedNextRef: React.MutableRefObject<PreloadedTrack | null>;
  /** Current play context (album, playlist, shuffle, etc.) for analytics */
  queueContextRef: React.MutableRefObject<PlayContext | undefined>;
}
