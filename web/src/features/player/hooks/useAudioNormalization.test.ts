import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioNormalization } from './useAudioNormalization';
import type { NormalizationSettings } from '../types';
import type { Track } from '@shared/types';


describe('useAudioNormalization', () => {
  // Default settings
  const defaultSettings: NormalizationSettings = {
    enabled: true,
    targetLufs: -16,
    preventClipping: true,
  };

  // Sample track with ReplayGain data
  const createTrack = (overrides: Partial<Track> = {}): Track => ({
    id: 'track-1',
    title: 'Test Song',
    path: '/music/test.mp3',
    duration: 180,
    rgTrackGain: -2.0, // Needs -2dB reduction
    rgTrackPeak: 0.9, // 90% peak
    ...overrides,
  } as Track);


  describe('calculateGain', () => {
    it('should return no gain when normalization is disabled', () => {
      const settings: NormalizationSettings = {
        ...defaultSettings,
        enabled: false,
      };
      const { result } = renderHook(() => useAudioNormalization(settings));

      const track = createTrack();
      const gain = result.current.calculateGain(track);

      expect(gain.gainDb).toBe(0);
      expect(gain.gainLinear).toBe(1);
      expect(gain.wasLimited).toBe(false);
    });

    it('should return no gain when track is null', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const gain = result.current.calculateGain(null);

      expect(gain.gainDb).toBe(0);
      expect(gain.gainLinear).toBe(1);
      expect(gain.wasLimited).toBe(false);
    });

    it('should return no gain when track has no ReplayGain data', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const track = createTrack({ rgTrackGain: undefined });
      const gain = result.current.calculateGain(track);

      expect(gain.gainDb).toBe(0);
      expect(gain.gainLinear).toBe(1);
      expect(gain.wasLimited).toBe(false);
    });

    it('should calculate correct gain for -16 LUFS target', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      // Track analyzed at -16 LUFS target with -2dB gain (slightly loud)
      const track = createTrack({ rgTrackGain: -2.0, rgTrackPeak: 0.7 });
      const gain = result.current.calculateGain(track);

      expect(gain.gainDb).toBe(-2.0);
      expect(gain.gainLinear).toBeCloseTo(0.794, 2); // 10^(-2/20)
      expect(gain.wasLimited).toBe(false);
    });

    it('should adjust gain for -14 LUFS Spotify target', () => {
      const settings: NormalizationSettings = {
        ...defaultSettings,
        targetLufs: -14,
      };
      const { result } = renderHook(() => useAudioNormalization(settings));

      // Track analyzed at -16 LUFS with -2dB gain
      // Adjusting to -14 LUFS: -2 + (-14 - (-16)) = -2 + 2 = 0dB
      const track = createTrack({ rgTrackGain: -2.0, rgTrackPeak: 0.5 });
      const gain = result.current.calculateGain(track);

      expect(gain.gainDb).toBe(0);
      expect(gain.gainLinear).toBe(1);
    });

    it('should limit positive gain to 0dB (no boost)', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      // Very quiet track that would need boost
      const track = createTrack({ rgTrackGain: 10.0, rgTrackPeak: 0.1 });
      const gain = result.current.calculateGain(track);

      expect(gain.gainDb).toBe(0);
      expect(gain.gainLinear).toBe(1);
      expect(gain.wasLimited).toBe(true);
    });

    it('should prevent clipping when preventClipping is enabled', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      // Track with high peak that would clip with applied gain
      // rgTrackPeak: 0.95 means peak at -0.45 dBFS
      // With -1dB headroom requirement, max gain = -0.45 - 1 = -1.45 dB approx
      const track = createTrack({ rgTrackGain: 0, rgTrackPeak: 0.95 });
      const gain = result.current.calculateGain(track);

      // Gain should be limited to prevent True Peak > -1 dBTP
      expect(gain.wasLimited).toBe(true);
      expect(gain.gainDb).toBeLessThan(0);
    });

    it('should not limit clipping when preventClipping is disabled', () => {
      const settings: NormalizationSettings = {
        ...defaultSettings,
        preventClipping: false,
      };
      const { result } = renderHook(() => useAudioNormalization(settings));

      // Track with negative gain that doesn't need limiting
      const track = createTrack({ rgTrackGain: -3.0, rgTrackPeak: 0.95 });
      const gain = result.current.calculateGain(track);

      // With clipping prevention off, gain should be applied as-is
      expect(gain.gainDb).toBe(-3.0);
    });

    it('should handle null rgTrackGain correctly', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const track = createTrack({ rgTrackGain: null as unknown as number });
      const gain = result.current.calculateGain(track);

      expect(gain.gainDb).toBe(0);
      expect(gain.gainLinear).toBe(1);
    });

    it('should handle zero peak value safely', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      // Edge case: peak of 0 should not cause division issues
      const track = createTrack({ rgTrackGain: -2.0, rgTrackPeak: 0 });
      const gain = result.current.calculateGain(track);

      // Should skip peak-based limiting when peak is 0
      expect(gain.gainDb).toBe(-2.0);
    });
  });

  describe('registerAudioElements', () => {
    it('should store audio element references', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const mockAudioA = document.createElement('audio');
      const mockAudioB = document.createElement('audio');

      act(() => {
        result.current.registerAudioElements(mockAudioA, mockAudioB);
        // Set user volume to 1.0 for cleaner test (default is 0.7)
        result.current.setUserVolume(1.0);
      });

      // Verification through applyGain which uses these elements
      const track = createTrack({ rgTrackGain: -3.0, rgTrackPeak: 0.5 });

      act(() => {
        result.current.applyGain(track);
      });

      // Audio elements should have volume adjusted
      // effectiveVolume = userVolume (1.0) * gainLinear (10^(-3/20) ≈ 0.708)
      expect(mockAudioA.volume).toBeCloseTo(0.708, 2);
      expect(mockAudioB.volume).toBeCloseTo(0.708, 2);
    });
  });

  describe('setUserVolume', () => {
    it('should update user volume and apply effective volume', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const mockAudio = document.createElement('audio');

      act(() => {
        result.current.registerAudioElements(mockAudio, null);
      });

      // First apply a gain
      const track = createTrack({ rgTrackGain: 0, rgTrackPeak: 0.5 });
      act(() => {
        result.current.applyGain(track);
      });

      // Then set user volume to 50%
      act(() => {
        result.current.setUserVolume(0.5);
      });

      // Audio volume should be userVolume * normalizationGain
      // With 0 dB gain (linear 1.0), effective volume = 0.5 * 1.0 = 0.5
      expect(mockAudio.volume).toBeCloseTo(0.5, 2);
    });

    it('should clamp effective volume to 1', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const mockAudio = document.createElement('audio');

      act(() => {
        result.current.registerAudioElements(mockAudio, null);
        result.current.setUserVolume(1.0);
      });

      // Gain of 0dB means linear gain of 1
      const track = createTrack({ rgTrackGain: 0, rgTrackPeak: 0.5 });
      act(() => {
        result.current.applyGain(track);
      });

      expect(mockAudio.volume).toBeLessThanOrEqual(1);
    });
  });

  describe('applyGain', () => {
    it('should apply gain to registered audio elements', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const mockAudio = document.createElement('audio');
      mockAudio.volume = 1.0;

      act(() => {
        result.current.registerAudioElements(mockAudio, null);
        result.current.setUserVolume(1.0);
      });

      const track = createTrack({ rgTrackGain: -6.0, rgTrackPeak: 0.5 });

      act(() => {
        result.current.applyGain(track);
      });

      // Volume should be userVolume (1.0) * gainLinear (10^(-6/20) ≈ 0.501)
      expect(mockAudio.volume).toBeCloseTo(0.501, 2);
    });

    it('should handle null track gracefully', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      expect(() => {
        act(() => {
          result.current.applyGain(null);
        });
      }).not.toThrow();
    });
  });

  describe('getCurrentGain', () => {
    it('should return current normalization gain', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      // Initially should be 1 (no gain)
      expect(result.current.getCurrentGain()).toBe(1);

      const track = createTrack({ rgTrackGain: -6.0, rgTrackPeak: 0.5 });

      act(() => {
        result.current.applyGain(track);
      });

      expect(result.current.getCurrentGain()).toBeCloseTo(0.501, 2);
    });
  });

  describe('legacy API compatibility', () => {
    it('should provide no-op connectAudioElement method', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const mockAudio = document.createElement('audio');

      expect(() => {
        result.current.connectAudioElement(mockAudio, 'A');
      }).not.toThrow();
    });

    it('should provide no-op resumeAudioContext method', async () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      await expect(result.current.resumeAudioContext()).resolves.toBeUndefined();
    });

    it('should provide no-op initAudioContext method', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      expect(result.current.initAudioContext()).toBeNull();
    });
  });

  describe('settings reactivity', () => {
    it('should recalculate gain when settings change', () => {
      const { result, rerender } = renderHook(
        ({ settings }) => useAudioNormalization(settings),
        { initialProps: { settings: defaultSettings } }
      );

      const track = createTrack({ rgTrackGain: -2.0, rgTrackPeak: 0.5 });
      const gain1 = result.current.calculateGain(track);

      // Change target LUFS
      const newSettings: NormalizationSettings = {
        ...defaultSettings,
        targetLufs: -14,
      };
      rerender({ settings: newSettings });

      const gain2 = result.current.calculateGain(track);

      // Gains should be different due to target change
      expect(gain1.gainDb).not.toBe(gain2.gainDb);
    });

    it('should return no gain when disabled after being enabled', () => {
      const { result, rerender } = renderHook(
        ({ settings }) => useAudioNormalization(settings),
        { initialProps: { settings: defaultSettings } }
      );

      const track = createTrack({ rgTrackGain: -2.0, rgTrackPeak: 0.5 });

      // First calculation with enabled
      const gain1 = result.current.calculateGain(track);
      expect(gain1.gainDb).toBe(-2.0);

      // Disable normalization
      rerender({ settings: { ...defaultSettings, enabled: false } });

      const gain2 = result.current.calculateGain(track);
      expect(gain2.gainDb).toBe(0);
      expect(gain2.gainLinear).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme negative gain values', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      // Very loud track needing extreme reduction
      const track = createTrack({ rgTrackGain: -20.0, rgTrackPeak: 0.99 });
      const gain = result.current.calculateGain(track);

      expect(gain.gainDb).toBeLessThanOrEqual(-20);
      expect(gain.gainLinear).toBeCloseTo(0.1, 1);
    });

    it('should handle rgTrackPeak exactly at 1 and limit to prevent clipping', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      // With peak at 1.0 (0 dBFS) and gain of 0 dB, the maxAllowedGain is -1 dB
      // (to maintain True Peak ≤ -1 dBTP)
      // So a track with rgTrackGain = 0 should be limited to -1 dB
      const track = createTrack({ rgTrackGain: 0, rgTrackPeak: 1.0 });
      const gain = result.current.calculateGain(track);

      // Should apply clipping prevention (0 dB would exceed -1 dBTP headroom)
      expect(gain.wasLimited).toBe(true);
      expect(gain.gainDb).toBe(-1.0);
    });

    it('should not limit when gain is already below headroom', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      // With peak at 1.0 (0 dBFS), maxAllowedGain is -1 dB
      // A track with rgTrackGain = -5 is already below that, so no limiting needed
      const track = createTrack({ rgTrackGain: -5.0, rgTrackPeak: 1.0 });
      const gain = result.current.calculateGain(track);

      expect(gain.gainDb).toBe(-5.0);
      expect(gain.wasLimited).toBe(false);
    });

    it('should handle very small peak values', () => {
      const { result } = renderHook(() => useAudioNormalization(defaultSettings));

      const track = createTrack({ rgTrackGain: -2.0, rgTrackPeak: 0.01 });
      const gain = result.current.calculateGain(track);

      // Very low peak means lots of headroom, gain should apply normally
      expect(gain.gainDb).toBe(-2.0);
      expect(gain.wasLimited).toBe(false);
    });
  });
});
