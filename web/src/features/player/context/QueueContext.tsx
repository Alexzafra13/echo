/**
 * QueueContext — Cola de reproducción.
 *
 * Capa base sin dependencias de otros contextos del player.
 * Gestiona la lista de pistas, índice actual, shuffle y repeat.
 */

import { createContext, useContext } from 'react';
import type { Track, PlayContext } from '../types';

export interface QueueContextValue {
  queue: Track[];
  currentIndex: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';

  addToQueue: (track: Track | Track[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playQueue: (tracks: Track[], startIndex?: number, context?: PlayContext) => void | Promise<void>;
  toggleShuffle: () => void;
  setShuffle: (enabled: boolean) => void;
  toggleRepeat: () => void;
}

export const QueueContext = createContext<QueueContextValue | undefined>(undefined);

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a PlayerProvider');
  }
  return context;
}
