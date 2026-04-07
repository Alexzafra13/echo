import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore, getPersistedSession } from './sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().clearActiveSession();
    localStorage.clear();
  });

  describe('setActiveSession', () => {
    it('should set session and role', () => {
      const mockSession = { id: 's1', name: 'Party', isActive: true } as never;

      useSessionStore.getState().setActiveSession(mockSession, 'host');

      const state = useSessionStore.getState();
      expect(state.activeSession).toEqual(mockSession);
      expect(state.myRole).toBe('host');
    });

    it('should persist to localStorage', () => {
      const mockSession = { id: 's1' } as never;
      useSessionStore.getState().setActiveSession(mockSession, 'dj');

      const persisted = JSON.parse(localStorage.getItem('echo_active_session')!);
      expect(persisted).toEqual({ id: 's1', role: 'dj' });
    });
  });

  describe('clearActiveSession', () => {
    it('should clear all state', () => {
      const mockSession = { id: 's1' } as never;
      useSessionStore.getState().setActiveSession(mockSession, 'host');
      useSessionStore.getState().setSyncing(true);

      useSessionStore.getState().clearActiveSession();

      const state = useSessionStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.myRole).toBeNull();
      expect(state.isSyncing).toBe(false);
      expect(state.hostPlaybackState).toBeNull();
    });

    it('should remove from localStorage', () => {
      localStorage.setItem('echo_active_session', '{}');
      useSessionStore.getState().clearActiveSession();
      expect(localStorage.getItem('echo_active_session')).toBeNull();
    });
  });

  describe('updateQueue', () => {
    it('should update queue when session exists', () => {
      const mockSession = { id: 's1', queue: [] } as never;
      useSessionStore.getState().setActiveSession(mockSession, 'host');

      const newQueue = [{ id: 'q1', trackId: 't1' }] as never[];
      useSessionStore.getState().updateQueue(newQueue);

      expect(useSessionStore.getState().activeSession?.queue).toEqual(newQueue);
    });

    it('should not update when no session', () => {
      useSessionStore.getState().updateQueue([] as never[]);
      expect(useSessionStore.getState().activeSession).toBeNull();
    });
  });

  describe('updateCurrentTrack', () => {
    it('should update track and position', () => {
      const mockSession = { id: 's1', currentTrackId: 't1', currentPosition: 0 } as never;
      useSessionStore.getState().setActiveSession(mockSession, 'listener');

      useSessionStore.getState().updateCurrentTrack('t2', 3);

      const session = useSessionStore.getState().activeSession;
      expect(session?.currentTrackId).toBe('t2');
      expect(session?.currentPosition).toBe(3);
    });
  });

  describe('setHostPlaybackState', () => {
    it('should set playback state', () => {
      useSessionStore
        .getState()
        .setHostPlaybackState({ trackId: 't1', position: 30, isPlaying: true });
      expect(useSessionStore.getState().hostPlaybackState).toEqual({
        trackId: 't1',
        position: 30,
        isPlaying: true,
      });
    });
  });

  describe('getPersistedSession', () => {
    it('should return null when nothing persisted', () => {
      expect(getPersistedSession()).toBeNull();
    });

    it('should return persisted session data', () => {
      localStorage.setItem('echo_active_session', JSON.stringify({ id: 's1', role: 'host' }));
      expect(getPersistedSession()).toEqual({ id: 's1', role: 'host' });
    });

    it('should return null on invalid JSON', () => {
      localStorage.setItem('echo_active_session', 'invalid');
      expect(getPersistedSession()).toBeNull();
    });
  });
});
