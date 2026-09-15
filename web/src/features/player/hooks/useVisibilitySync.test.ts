import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVisibilitySync } from './useVisibilitySync';

vi.mock('@shared/utils/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
}

function foreground() {
  setHidden(false);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useVisibilitySync', () => {
  afterEach(() => {
    setHidden(false);
  });

  it('reanuda al volver si el usuario quería seguir escuchando', async () => {
    const audio = { paused: true, ended: false, play: vi.fn().mockResolvedValue(undefined) };
    const setIsPlaying = vi.fn();

    renderHook(() =>
      useVisibilitySync({
        isPlaying: false,
        wantsToPlayRef: { current: true },
        getActiveAudio: () => audio as unknown as HTMLAudioElement,
        setIsPlaying,
      })
    );

    foreground();

    expect(audio.play).toHaveBeenCalled();
  });

  it('no reanuda si el usuario había pausado', () => {
    const audio = { paused: true, ended: false, play: vi.fn().mockResolvedValue(undefined) };

    renderHook(() =>
      useVisibilitySync({
        isPlaying: false,
        wantsToPlayRef: { current: false },
        getActiveAudio: () => audio as unknown as HTMLAudioElement,
        setIsPlaying: vi.fn(),
      })
    );

    foreground();

    expect(audio.play).not.toHaveBeenCalled();
  });

  it('sincroniza el estado si el audio sigue sonando pero la UI cree que no', () => {
    const audio = { paused: false, ended: false, play: vi.fn() };
    const setIsPlaying = vi.fn();

    renderHook(() =>
      useVisibilitySync({
        isPlaying: false,
        wantsToPlayRef: { current: false },
        getActiveAudio: () => audio as unknown as HTMLAudioElement,
        setIsPlaying,
      })
    );

    foreground();

    expect(setIsPlaying).toHaveBeenCalledWith(true);
  });

  it('no hace nada mientras la app sigue en segundo plano', () => {
    const audio = { paused: true, ended: false, play: vi.fn() };

    renderHook(() =>
      useVisibilitySync({
        isPlaying: false,
        wantsToPlayRef: { current: true },
        getActiveAudio: () => audio as unknown as HTMLAudioElement,
        setIsPlaying: vi.fn(),
      })
    );

    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(audio.play).not.toHaveBeenCalled();
  });
});
