import { create } from 'zustand';
import type {
  ListeningSession,
  SessionParticipant,
  SessionQueueItem,
  ParticipantRole,
} from '../types';

const SESSION_STORAGE_KEY = 'echo_active_session';

interface HostPlaybackState {
  trackId: string;
  position: number;
  isPlaying: boolean;
}

interface SessionState {
  activeSession: ListeningSession | null;
  myRole: ParticipantRole | null;

  // Sincronizacion de reproduccion
  isSyncing: boolean;
  hostPlaybackState: HostPlaybackState | null;

  setActiveSession: (session: ListeningSession, myRole: ParticipantRole) => void;
  clearActiveSession: () => void;
  updateQueue: (queue: SessionQueueItem[]) => void;
  updateParticipants: (participants: SessionParticipant[]) => void;
  updateCurrentTrack: (trackId: string, position: number) => void;
  setMyRole: (role: ParticipantRole) => void;
  setHostPlaybackState: (state: HostPlaybackState) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  myRole: null,
  isSyncing: false,
  hostPlaybackState: null,

  setActiveSession: (session, myRole) => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id: session.id, role: myRole }));
    } catch {
      /* no-op */
    }
    set({ activeSession: session, myRole });
  },

  clearActiveSession: () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* no-op */
    }
    set({ activeSession: null, myRole: null, isSyncing: false, hostPlaybackState: null });
  },

  updateQueue: (queue) =>
    set((state) => {
      if (!state.activeSession) return state;
      return { activeSession: { ...state.activeSession, queue } };
    }),

  updateParticipants: (participants) =>
    set((state) => {
      if (!state.activeSession) return state;
      return { activeSession: { ...state.activeSession, participants } };
    }),

  updateCurrentTrack: (trackId, position) =>
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          currentTrackId: trackId,
          currentPosition: position,
        },
      };
    }),

  setMyRole: (role) => set({ myRole: role }),
  setHostPlaybackState: (hostPlaybackState) => set({ hostPlaybackState }),
  setSyncing: (isSyncing) => set({ isSyncing }),
}));

// Recuperar sesion guardada al recargar
export function getPersistedSession(): { id: string; role: ParticipantRole } | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    /* no-op */ return null;
  }
}
