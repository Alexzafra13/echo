import { Injectable } from '@nestjs/common';
import { CAMELOT_COLORS } from '../../config/dj.config';

/**
 * DJ Compatibility Service
 *
 * Calculates compatibility scores between tracks based on:
 * - BPM matching (tempo compatibility for beatmatching)
 * - Key/Camelot compatibility (harmonic mixing)
 * - Energy flow (smooth energy transitions)
 */

// Camelot wheel mapping for harmonic mixing
const CAMELOT_WHEEL: Record<string, { number: number; letter: 'A' | 'B' }> = {
  // Minor keys (A column)
  'Am': { number: 8, letter: 'A' },
  'Em': { number: 9, letter: 'A' },
  'Bm': { number: 10, letter: 'A' },
  'F#m': { number: 11, letter: 'A' },
  'Gbm': { number: 11, letter: 'A' },
  'C#m': { number: 12, letter: 'A' },
  'Dbm': { number: 12, letter: 'A' },
  'G#m': { number: 1, letter: 'A' },
  'Abm': { number: 1, letter: 'A' },
  'D#m': { number: 2, letter: 'A' },
  'Ebm': { number: 2, letter: 'A' },
  'A#m': { number: 3, letter: 'A' },
  'Bbm': { number: 3, letter: 'A' },
  'Fm': { number: 4, letter: 'A' },
  'Cm': { number: 5, letter: 'A' },
  'Gm': { number: 6, letter: 'A' },
  'Dm': { number: 7, letter: 'A' },
  // Major keys (B column)
  'C': { number: 8, letter: 'B' },
  'G': { number: 9, letter: 'B' },
  'D': { number: 10, letter: 'B' },
  'A': { number: 11, letter: 'B' },
  'E': { number: 12, letter: 'B' },
  'B': { number: 1, letter: 'B' },
  'F#': { number: 2, letter: 'B' },
  'Gb': { number: 2, letter: 'B' },
  'C#': { number: 3, letter: 'B' },
  'Db': { number: 3, letter: 'B' },
  'G#': { number: 4, letter: 'B' },
  'Ab': { number: 4, letter: 'B' },
  'D#': { number: 5, letter: 'B' },
  'Eb': { number: 5, letter: 'B' },
  'A#': { number: 6, letter: 'B' },
  'Bb': { number: 6, letter: 'B' },
  'F': { number: 7, letter: 'B' },
};

// Reverse mapping from Camelot notation to keys
const CAMELOT_TO_KEY: Record<string, string> = {
  '1A': 'Abm', '1B': 'B',
  '2A': 'Ebm', '2B': 'Gb',
  '3A': 'Bbm', '3B': 'Db',
  '4A': 'Fm', '4B': 'Ab',
  '5A': 'Cm', '5B': 'Eb',
  '6A': 'Gm', '6B': 'Bb',
  '7A': 'Dm', '7B': 'F',
  '8A': 'Am', '8B': 'C',
  '9A': 'Em', '9B': 'G',
  '10A': 'Bm', '10B': 'D',
  '11A': 'F#m', '11B': 'A',
  '12A': 'C#m', '12B': 'E',
};

export interface CompatibilityScore {
  overall: number; // 0-100
  bpmScore: number; // 0-100
  keyScore: number; // 0-100
  energyScore: number; // 0-100
  bpmDiff: number; // Percentage difference
  keyCompatibility: 'perfect' | 'compatible' | 'energy_boost' | 'incompatible';
  energyDiff: number; // Absolute difference
  canBeatmatch: boolean;
  suggestedTransition: 'smooth' | 'energy_up' | 'energy_down' | 'key_change';
}

export interface TrackDjData {
  trackId: string;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  energy: number | null;
}

/**
 * Get Camelot notation from musical key
 */
export function keyToCamelot(key: string | null): string | null {
  if (!key || key === 'Unknown') return null;
  const camelot = CAMELOT_WHEEL[key];
  if (!camelot) return null;
  return `${camelot.number}${camelot.letter}`;
}

/**
 * Parse Camelot notation into number and letter
 */
function parseCamelot(camelot: string): { number: number; letter: 'A' | 'B' } | null {
  const match = camelot.match(/^(\d{1,2})([AB])$/);
  if (!match) return null;
  return {
    number: parseInt(match[1], 10),
    letter: match[2] as 'A' | 'B',
  };
}

/**
 * Calculate BPM compatibility score
 * - Perfect match (0% diff) = 100
 * - ±3% = 90 (easy beatmatch)
 * - ±6% = 70 (moderate pitch adjustment)
 * - ±10% = 40 (significant adjustment)
 * - >10% = decreasing score
 *
 * Also considers half/double time (e.g., 140 BPM compatible with 70 BPM)
 */
export function calculateBpmScore(bpm1: number | null, bpm2: number | null): { score: number; diff: number; canBeatmatch: boolean } {
  if (!bpm1 || !bpm2 || bpm1 === 0 || bpm2 === 0) {
    return { score: 50, diff: 0, canBeatmatch: false }; // Unknown, neutral score
  }

  // Check direct match and half/double time
  const diffs = [
    Math.abs(bpm1 - bpm2) / bpm1, // Direct
    Math.abs(bpm1 - bpm2 * 2) / bpm1, // Double time
    Math.abs(bpm1 - bpm2 / 2) / bpm1, // Half time
  ];

  const minDiff = Math.min(...diffs);
  const diffPercent = minDiff * 100;

  let score: number;
  let canBeatmatch = true;

  if (diffPercent <= 0.5) {
    score = 100; // Perfect match
  } else if (diffPercent <= 3) {
    score = 95 - (diffPercent * 1.67); // 95-90
  } else if (diffPercent <= 6) {
    score = 90 - ((diffPercent - 3) * 6.67); // 90-70
  } else if (diffPercent <= 10) {
    score = 70 - ((diffPercent - 6) * 7.5); // 70-40
    canBeatmatch = diffPercent <= 8;
  } else {
    score = Math.max(0, 40 - ((diffPercent - 10) * 4)); // 40-0
    canBeatmatch = false;
  }

  return { score, diff: diffPercent, canBeatmatch };
}

/**
 * Calculate key/harmonic compatibility score using Camelot wheel
 *
 * Compatible combinations:
 * - Same key (9B → 9B) = 100 (perfect)
 * - ±1 on wheel (9B → 8B, 10B) = 90 (energy change)
 * - Same number, different letter (9B → 9A) = 85 (mood shift major↔minor)
 * - ±2 on wheel = 60 (noticeable but usable)
 * - Other = 20-40 (clash)
 */
export function calculateKeyScore(
  camelot1: string | null,
  camelot2: string | null
): { score: number; compatibility: 'perfect' | 'compatible' | 'energy_boost' | 'incompatible' } {
  if (!camelot1 || !camelot2) {
    return { score: 50, compatibility: 'compatible' }; // Unknown, neutral
  }

  const c1 = parseCamelot(camelot1);
  const c2 = parseCamelot(camelot2);

  if (!c1 || !c2) {
    return { score: 50, compatibility: 'compatible' };
  }

  // Same key
  if (c1.number === c2.number && c1.letter === c2.letter) {
    return { score: 100, compatibility: 'perfect' };
  }

  // Calculate circular distance on the wheel (1-12)
  const distance = Math.min(
    Math.abs(c1.number - c2.number),
    12 - Math.abs(c1.number - c2.number)
  );

  // Same number, different letter (major↔minor)
  if (distance === 0 && c1.letter !== c2.letter) {
    return { score: 85, compatibility: 'compatible' };
  }

  // Adjacent on wheel (±1)
  if (distance === 1 && c1.letter === c2.letter) {
    return { score: 90, compatibility: 'energy_boost' };
  }

  // Adjacent + mood shift
  if (distance === 1 && c1.letter !== c2.letter) {
    return { score: 75, compatibility: 'compatible' };
  }

  // ±2 on wheel
  if (distance === 2) {
    return { score: 55, compatibility: 'compatible' };
  }

  // Incompatible
  const score = Math.max(20, 50 - (distance * 5));
  return { score, compatibility: 'incompatible' };
}

/**
 * Calculate energy flow score
 *
 * - Small change (±0.1) = 100 (smooth)
 * - Moderate change (±0.2) = 80 (noticeable)
 * - Large change (±0.3) = 60 (dramatic)
 * - Very large = decreasing
 */
export function calculateEnergyScore(
  energy1: number | null,
  energy2: number | null
): { score: number; diff: number; transition: 'smooth' | 'energy_up' | 'energy_down' } {
  if (energy1 === null || energy2 === null) {
    return { score: 70, diff: 0, transition: 'smooth' }; // Unknown, neutral
  }

  const diff = energy2 - energy1;
  const absDiff = Math.abs(diff);

  let score: number;
  if (absDiff <= 0.1) {
    score = 100;
  } else if (absDiff <= 0.2) {
    score = 90 - ((absDiff - 0.1) * 100); // 90-80
  } else if (absDiff <= 0.3) {
    score = 80 - ((absDiff - 0.2) * 100); // 80-70
  } else if (absDiff <= 0.5) {
    score = 70 - ((absDiff - 0.3) * 50); // 70-60
  } else {
    score = Math.max(30, 60 - ((absDiff - 0.5) * 60)); // 60-30
  }

  const transition = absDiff <= 0.15 ? 'smooth' : (diff > 0 ? 'energy_up' : 'energy_down');

  return { score, diff, transition };
}

/**
 * Calculate overall compatibility score between two tracks
 */
export function calculateCompatibility(
  track1: TrackDjData,
  track2: TrackDjData
): CompatibilityScore {
  const bpmResult = calculateBpmScore(track1.bpm, track2.bpm);
  const keyResult = calculateKeyScore(track1.camelotKey, track2.camelotKey);
  const energyResult = calculateEnergyScore(track1.energy, track2.energy);

  // Weighted average: BPM most important for DJing, then key, then energy
  const overall = Math.round(
    bpmResult.score * 0.40 +
    keyResult.score * 0.40 +
    energyResult.score * 0.20
  );

  // Determine suggested transition type
  let suggestedTransition: 'smooth' | 'energy_up' | 'energy_down' | 'key_change';
  if (keyResult.compatibility === 'incompatible') {
    suggestedTransition = 'key_change';
  } else if (energyResult.transition !== 'smooth') {
    suggestedTransition = energyResult.transition;
  } else {
    suggestedTransition = 'smooth';
  }

  return {
    overall,
    bpmScore: Math.round(bpmResult.score),
    keyScore: Math.round(keyResult.score),
    energyScore: Math.round(energyResult.score),
    bpmDiff: Math.round(bpmResult.diff * 10) / 10,
    keyCompatibility: keyResult.compatibility,
    energyDiff: Math.round(energyResult.diff * 100) / 100,
    canBeatmatch: bpmResult.canBeatmatch,
    suggestedTransition,
  };
}

/**
 * Get color info for a Camelot key
 */
export function getCamelotColor(camelotKey: string | null): { bg: string; text: string; name: string } | null {
  if (!camelotKey) return null;
  return CAMELOT_COLORS[camelotKey] || null;
}

/**
 * Get compatible Camelot keys for a given key
 */
export function getCompatibleCamelotKeys(camelotKey: string): string[] {
  const parsed = parseCamelot(camelotKey);
  if (!parsed) return [];

  const { number, letter } = parsed;
  const compatible: string[] = [];

  // Same key
  compatible.push(camelotKey);

  // Same number, opposite letter (major↔minor)
  compatible.push(`${number}${letter === 'A' ? 'B' : 'A'}`);

  // +1 on wheel (same letter)
  const plus1 = number === 12 ? 1 : number + 1;
  compatible.push(`${plus1}${letter}`);

  // -1 on wheel (same letter)
  const minus1 = number === 1 ? 12 : number - 1;
  compatible.push(`${minus1}${letter}`);

  return compatible;
}

/**
 * Injectable service wrapper for DJ compatibility calculations
 */
@Injectable()
export class DjCompatibilityService {
  calculateCompatibility(track1: TrackDjData, track2: TrackDjData): CompatibilityScore {
    return calculateCompatibility(track1, track2);
  }

  getCompatibleCamelotKeys(camelotKey: string): string[] {
    return getCompatibleCamelotKeys(camelotKey);
  }

  calculateBpmScore(bpm1: number | null, bpm2: number | null) {
    return calculateBpmScore(bpm1, bpm2);
  }

  calculateKeyScore(camelot1: string | null, camelot2: string | null) {
    return calculateKeyScore(camelot1, camelot2);
  }

  calculateEnergyScore(energy1: number | null, energy2: number | null) {
    return calculateEnergyScore(energy1, energy2);
  }

  keyToCamelot(key: string | null): string | null {
    return keyToCamelot(key);
  }

  getCamelotColor(camelotKey: string | null): { bg: string; text: string; name: string } | null {
    return getCamelotColor(camelotKey);
  }
}
