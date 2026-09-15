import { describe, it, expect } from 'vitest';
import { getTrackGainMultiplier } from './replayGain';

describe('getTrackGainMultiplier', () => {
  it('devuelve 1 si la normalización está desactivada', () => {
    expect(getTrackGainMultiplier({ rgTrackGain: -6 }, false)).toBe(1);
  });

  it('devuelve 1 si la pista no tiene ganancia calculada', () => {
    expect(getTrackGainMultiplier({}, true)).toBe(1);
    expect(getTrackGainMultiplier(null, true)).toBe(1);
  });

  it('atenúa las pistas con ganancia negativa', () => {
    expect(getTrackGainMultiplier({ rgTrackGain: -6 }, true)).toBeCloseTo(0.501, 3);
    expect(getTrackGainMultiplier({ rgTrackGain: -20 }, true)).toBeCloseTo(0.1, 3);
  });

  it('no amplifica por encima de 1', () => {
    expect(getTrackGainMultiplier({ rgTrackGain: 4 }, true)).toBe(1);
  });

  it('no baja del mínimo audible', () => {
    expect(getTrackGainMultiplier({ rgTrackGain: -40 }, true)).toBe(0.1);
  });

  it('usa la ganancia de álbum si la pista no tiene la suya', () => {
    expect(getTrackGainMultiplier({ rgAlbumGain: -6 }, true)).toBeCloseTo(0.501, 3);
  });
});
