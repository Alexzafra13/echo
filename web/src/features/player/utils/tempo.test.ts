import { describe, it, expect } from 'vitest';
import { getTempoRatio } from './tempo';

describe('getTempoRatio', () => {
  it('devuelve undefined si falta el BPM de alguna pista', () => {
    expect(getTempoRatio({ bpm: 120 }, {})).toBeUndefined();
    expect(getTempoRatio(null, { bpm: 120 })).toBeUndefined();
    expect(getTempoRatio({ bpm: 0 }, { bpm: 120 })).toBeUndefined();
  });

  it('calcula la relación cuando la diferencia es pequeña', () => {
    expect(getTempoRatio({ bpm: 120 }, { bpm: 126 })).toBeCloseTo(1.05);
    expect(getTempoRatio({ bpm: 126 }, { bpm: 120 })).toBeCloseTo(0.952, 3);
  });

  it('no ajusta si la diferencia supera el máximo', () => {
    expect(getTempoRatio({ bpm: 120 }, { bpm: 130 })).toBeUndefined();
    expect(getTempoRatio({ bpm: 120 }, { bpm: 110 })).toBeUndefined();
  });

  it('trata el doble y la mitad de tempo como equivalentes', () => {
    expect(getTempoRatio({ bpm: 80 }, { bpm: 164 })).toBeCloseTo(1.025);
    expect(getTempoRatio({ bpm: 160 }, { bpm: 82 })).toBeCloseTo(1.025);
  });
});
