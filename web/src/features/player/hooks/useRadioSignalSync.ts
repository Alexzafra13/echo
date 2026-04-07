import { useEffect } from 'react';
import type { RefObject } from 'react';

interface UseRadioSignalSyncOptions {
  audioRefA: RefObject<HTMLAudioElement | null>;
  audioRefB: RefObject<HTMLAudioElement | null>;
  isRadioMode: boolean;
  setSignalStatus: (status: 'good' | 'weak' | 'error') => void;
}

/**
 * Syncs radio signal status based on audio element events.
 * Updates signal to 'good' on playing, 'weak' on waiting/stalled, 'error' on error.
 */
export function useRadioSignalSync({
  audioRefA,
  audioRefB,
  isRadioMode,
  setSignalStatus,
}: UseRadioSignalSyncOptions) {
  useEffect(() => {
    if (!isRadioMode) return;

    const audioA = audioRefA.current;
    const audioB = audioRefB.current;
    if (!audioA || !audioB) return;

    const handlePlaying = () => setSignalStatus('good');
    const handleWaiting = () => setSignalStatus('weak');
    const handleStalled = () => setSignalStatus('weak');
    const handleError = () => setSignalStatus('error');

    const events = ['playing', 'waiting', 'stalled', 'error'] as const;
    const handlers = [handlePlaying, handleWaiting, handleStalled, handleError];

    for (const audio of [audioA, audioB]) {
      events.forEach((event, i) => audio.addEventListener(event, handlers[i]));
    }

    return () => {
      for (const audio of [audioA, audioB]) {
        events.forEach((event, i) => audio.removeEventListener(event, handlers[i]));
      }
    };
  }, [audioRefA, audioRefB, isRadioMode, setSignalStatus]);
}
