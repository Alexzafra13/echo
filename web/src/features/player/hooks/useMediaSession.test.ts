import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaSession } from './useMediaSession';
import type { Track } from '../types';

vi.mock('../store/timeStore', () => ({
  getCurrentTime: vi.fn().mockReturnValue(30),
  getDuration: vi.fn().mockReturnValue(180),
}));

describe('useMediaSession', () => {
  let setActionHandler: ReturnType<typeof vi.fn>;
  let handlers: Record<string, MediaSessionActionHandler | null>;

  beforeEach(() => {
    handlers = {};
    setActionHandler = vi.fn((action: string, handler: MediaSessionActionHandler | null) => {
      handlers[action] = handler;
    });
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: {
        metadata: null,
        playbackState: 'none',
        setActionHandler,
        setPositionState: vi.fn(),
      },
    });
    (globalThis as { MediaMetadata?: unknown }).MediaMetadata = class {
      constructor(public init: unknown) {}
    };
  });

  afterEach(() => {
    delete (navigator as { mediaSession?: unknown }).mediaSession;
  });

  function renderSession() {
    const props = {
      currentTrack: { id: 't1', title: 'Song', artist: 'Artist', albumId: 'a1' } as Track,
      radio: { isRadioMode: false, currentStation: null, metadata: null },
      isPlaying: true,
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      playPrevious: vi.fn(),
      playNext: vi.fn(),
      seek: vi.fn(),
    };
    renderHook(() => useMediaSession(props));
    return props;
  }

  it('registra anterior/siguiente pista para la notificación del sistema', () => {
    const props = renderSession();

    expect(handlers.previoustrack).toBeTypeOf('function');
    expect(handlers.nexttrack).toBeTypeOf('function');

    handlers.nexttrack!({ action: 'nexttrack' });
    expect(props.playNext).toHaveBeenCalled();
  });

  it('no registra seekbackward/seekforward para que el SO muestre siguiente pista', () => {
    renderSession();

    const registered = setActionHandler.mock.calls.map((call) => call[0]);
    expect(registered).not.toContain('seekbackward');
    expect(registered).not.toContain('seekforward');
    expect(registered).toContain('seekto');
  });

  it('marca el estado de reproducción del SO', () => {
    renderSession();
    expect(navigator.mediaSession.playbackState).toBe('playing');
  });
});
