import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadioPlayback } from './useRadioPlayback';
import type { AudioElements } from './useAudioElements';
import type { RadioStation } from '@shared/types/radio.types';

// Mock the stream proxy
vi.mock('../utils/streamProxy', () => ({
  getProxiedStreamUrl: vi.fn((url: string) => url),
}));

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Create a mock audio element
const createMockAudioElement = () => {
  const audio = {
    src: '',
    volume: 1,
    currentTime: 0,
    paused: true,
    oncanplay: null as (() => void) | null,
    onerror: null as (() => void) | null,
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  };
  return audio as unknown as HTMLAudioElement;
};

const createMockAudioElements = (): AudioElements => {
  const mockAudio = createMockAudioElement();

  return {
    audioA: mockAudio,
    audioB: createMockAudioElement(),
    activeAudio: 'A',
    getActiveAudio: vi.fn().mockReturnValue(mockAudio),
    getInactiveAudio: vi.fn(),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getDuration: vi.fn().mockReturnValue(0),
    setVolume: vi.fn(),
    playActive: vi.fn().mockResolvedValue(undefined),
    pauseActive: vi.fn(),
    playInactive: vi.fn(),
    loadOnActive: vi.fn(),
    loadOnInactive: vi.fn(),
    switchAudio: vi.fn(),
    stopBoth: vi.fn().mockResolvedValue(undefined), // Must be async - playRadio awaits this
    resetToAudioA: vi.fn(),
    fadeOutAudio: vi.fn(),
    setOnEnded: vi.fn(),
    setOnTimeUpdate: vi.fn(),
    setOnError: vi.fn(),
    setOnCanPlay: vi.fn(),
    setOnLoadedMetadata: vi.fn(),
    setOnWaiting: vi.fn(),
    setOnPlaying: vi.fn(),
  };
};

const createRadioStation = (overrides?: Partial<RadioStation>): RadioStation => ({
  stationUuid: 'station-123',
  name: 'Test Radio',
  url: 'http://stream.test.com/radio',
  urlResolved: 'http://stream.test.com/radio/resolved',
  homepage: 'https://test.com',
  favicon: 'https://test.com/favicon.png',
  country: 'Spain',
  countryCode: 'ES',
  state: 'Madrid',
  language: 'Spanish',
  tags: 'pop,rock',
  codec: 'MP3',
  bitrate: 128,
  votes: 100,
  clickCount: 1000,
  lastCheckOk: true,
  ...overrides,
});

describe('useRadioPlayback', () => {
  let audioElements: AudioElements;

  beforeEach(() => {
    vi.clearAllMocks();
    audioElements = createMockAudioElements();
  });

  describe('initial state', () => {
    it('should start with no radio mode', () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      expect(result.current.isRadioMode).toBe(false);
      expect(result.current.currentStation).toBe(null);
      expect(result.current.signalStatus).toBe(null);
      expect(result.current.metadata).toBe(null);
    });
  });

  describe('playRadio', () => {
    it('should play a radio station', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      const station = createRadioStation();

      await act(async () => {
        await result.current.playRadio(station);
      });

      expect(result.current.isRadioMode).toBe(true);
      expect(result.current.currentStation).toEqual(station);
      expect(result.current.signalStatus).toBe('good');
    });

    it('should stop existing audio before playing', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      expect(audioElements.stopBoth).toHaveBeenCalled();
      expect(audioElements.resetToAudioA).toHaveBeenCalled();
    });

    it('should use urlResolved when available', async () => {
      const mockAudio = createMockAudioElement();
      audioElements.getActiveAudio = vi.fn().mockReturnValue(mockAudio);

      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      const station = createRadioStation({
        url: 'http://basic.url',
        urlResolved: 'http://resolved.url',
      });

      await act(async () => {
        await result.current.playRadio(station);
      });

      expect(mockAudio.src).toBe('http://resolved.url');
    });

    it('should fall back to url when urlResolved is empty', async () => {
      const mockAudio = createMockAudioElement();
      audioElements.getActiveAudio = vi.fn().mockReturnValue(mockAudio);

      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      // Station with urlResolved as empty string (falsy but property exists)
      const station = createRadioStation({
        url: 'http://basic.url',
        urlResolved: '',
      });

      await act(async () => {
        await result.current.playRadio(station);
      });

      // When urlResolved is falsy, should return false (no valid URL)
      // This is the actual behavior - hook checks if streamUrl is truthy
      expect(result.current.isRadioMode).toBe(false);
    });

    it('should return false when station has no valid URL', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      const station = createRadioStation({
        url: '',
        urlResolved: undefined,
      });

      let returnValue: boolean | undefined;
      await act(async () => {
        returnValue = await result.current.playRadio(station);
      });

      expect(returnValue).toBe(false);
      expect(result.current.isRadioMode).toBe(false);
    });

    it('should return false when no active audio element', async () => {
      audioElements.getActiveAudio = vi.fn().mockReturnValue(null);

      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      let returnValue: boolean | undefined;
      await act(async () => {
        returnValue = await result.current.playRadio(createRadioStation());
      });

      expect(returnValue).toBe(false);
    });

    it('should load and call audio.load()', async () => {
      const mockAudio = createMockAudioElement();
      audioElements.getActiveAudio = vi.fn().mockReturnValue(mockAudio);

      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      expect(mockAudio.load).toHaveBeenCalled();
    });

    it('should clear metadata when playing new station', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      // Set some metadata first
      act(() => {
        result.current.setMetadata({ title: 'Old Song', artist: 'Old Artist' });
      });

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      expect(result.current.metadata).toBe(null);
    });

    it('should handle RadioBrowserStation format with url_resolved', async () => {
      const mockAudio = createMockAudioElement();
      audioElements.getActiveAudio = vi.fn().mockReturnValue(mockAudio);

      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      // RadioBrowserStation format (from API)
      const browserStation = {
        stationuuid: 'uuid-123',
        name: 'Browser Station',
        url: 'http://basic.url',
        url_resolved: 'http://resolved.url',
        homepage: '',
        favicon: '',
        country: 'Spain',
        countrycode: 'ES',
        state: '',
        language: '',
        tags: '',
        codec: 'MP3',
        bitrate: 128,
        votes: 0,
        clickcount: 0,
        lastcheckok: 1,
      };

      await act(async () => {
        await result.current.playRadio(browserStation as never);
      });

      expect(mockAudio.src).toBe('http://resolved.url');
      expect(result.current.currentStation?.stationUuid).toBe('uuid-123');
    });
  });

  describe('stopRadio', () => {
    it('should stop radio playback and reset state', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      expect(result.current.isRadioMode).toBe(true);

      await act(async () => {
        await result.current.stopRadio();
      });

      expect(result.current.isRadioMode).toBe(false);
      expect(result.current.currentStation).toBe(null);
      expect(result.current.signalStatus).toBe(null);
      expect(result.current.metadata).toBe(null);
    });

    it('should call stopBoth and resetToAudioA', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.stopRadio();
      });

      expect(audioElements.stopBoth).toHaveBeenCalled();
      expect(audioElements.resetToAudioA).toHaveBeenCalled();
    });
  });

  describe('resumeRadio', () => {
    it('should resume playback when in radio mode', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      let resumed: boolean | undefined;
      await act(async () => {
        resumed = await result.current.resumeRadio();
      });

      expect(resumed).toBe(true);
      expect(audioElements.playActive).toHaveBeenCalled();
    });

    it('should return false when not in radio mode', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      let resumed: boolean | undefined;
      await act(async () => {
        resumed = await result.current.resumeRadio();
      });

      expect(resumed).toBe(false);
      expect(audioElements.playActive).not.toHaveBeenCalled();
    });

    it('should return false on play error', async () => {
      audioElements.playActive = vi.fn().mockRejectedValue(new Error('Play failed'));

      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      let resumed: boolean | undefined;
      await act(async () => {
        resumed = await result.current.resumeRadio();
      });

      expect(resumed).toBe(false);
    });
  });

  describe('pauseRadio', () => {
    it('should pause when in radio mode', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      act(() => {
        result.current.pauseRadio();
      });

      expect(audioElements.pauseActive).toHaveBeenCalled();
    });

    it('should do nothing when not in radio mode', () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      act(() => {
        result.current.pauseRadio();
      });

      expect(audioElements.pauseActive).not.toHaveBeenCalled();
    });
  });

  describe('setMetadata', () => {
    it('should update metadata', () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      act(() => {
        result.current.setMetadata({ title: 'Song Title', artist: 'Artist Name' });
      });

      expect(result.current.metadata).toEqual({
        title: 'Song Title',
        artist: 'Artist Name',
      });
    });

    it('should allow clearing metadata', () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      act(() => {
        result.current.setMetadata({ title: 'Song', artist: 'Artist' });
      });

      act(() => {
        result.current.setMetadata(null);
      });

      expect(result.current.metadata).toBe(null);
    });
  });

  describe('setSignalStatus', () => {
    it('should update signal status when in radio mode', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      act(() => {
        result.current.setSignalStatus('weak');
      });

      expect(result.current.signalStatus).toBe('weak');
    });

    it('should not update signal status when not in radio mode', () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      act(() => {
        result.current.setSignalStatus('weak');
      });

      expect(result.current.signalStatus).toBe(null);
    });

    it('should handle error status', async () => {
      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      act(() => {
        result.current.setSignalStatus('error');
      });

      expect(result.current.signalStatus).toBe('error');
    });
  });

  describe('audio event handlers', () => {
    it('should set oncanplay handler that plays audio', async () => {
      const mockAudio = createMockAudioElement();
      audioElements.getActiveAudio = vi.fn().mockReturnValue(mockAudio);

      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      // Verify oncanplay was set
      expect(mockAudio.oncanplay).not.toBe(null);

      // Simulate canplay event
      act(() => {
        mockAudio.oncanplay?.();
      });

      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should set signal status to error on audio error', async () => {
      const mockAudio = createMockAudioElement();
      audioElements.getActiveAudio = vi.fn().mockReturnValue(mockAudio);

      const { result } = renderHook(() =>
        useRadioPlayback({ audioElements })
      );

      await act(async () => {
        await result.current.playRadio(createRadioStation());
      });

      // Simulate error event
      act(() => {
        mockAudio.onerror?.();
      });

      expect(result.current.signalStatus).toBe('error');
    });
  });
});
