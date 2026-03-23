import { create } from 'zustand';
import type { ListeningSession, SessionParticipant, SessionQueueItem, ParticipantRole } from '../types';

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

  setActiveSession: (session, myRole) =>
    set({ activeSession: session, myRole }),

  clearActiveSession: () =>
    set({ activeSession: null, myRole: null, isSyncing: false, hostPlaybackState: null }),

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
