import { Injectable } from '@nestjs/common';
import { CAMELOT_COLORS, DJ_CONFIG } from '../../config/dj.config';
import {
  keyToCamelot as camelotUtilKeyToCamelot,
  parseCamelot,
  getCompatibleCamelotKeys as utilGetCompatibleKeys,
  calculateHarmonicScore,
  getCamelotDistance,
  type HarmonicCompatibility,
} from '../utils/camelot.util';

export interface CompatibilityScore {
  overall: number;
  bpmScore: number;
  keyScore: number;
  energyScore: number;
  danceabilityScore: number | null;
  bpmDiff: number;
  keyCompatibility: 'perfect' | 'compatible' | 'energy_boost' | 'incompatible';
  energyDiff: number;
  danceabilityDiff: number | null;
  canBeatmatch: boolean;
  suggestedTransition: 'smooth' | 'energy_up' | 'energy_down' | 'key_change';
}

export interface TrackDjData {
  trackId: string;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  energy: number | null;
  danceability?: number | null;
}

export function keyToCamelot(key: string | null): string | null {
  return camelotUtilKeyToCamelot(key);
}

// Compatibilidad de BPM considerando half/double time
export function calculateBpmScore(bpm1: number | null, bpm2: number | null): { score: number; diff: number; canBeatmatch: boolean } {
  if (!bpm1 || !bpm2 || bpm1 === 0 || bpm2 === 0) {
    return { score: 50, diff: 0, canBeatmatch: false };
  }

  const diffs = [
    Math.abs(bpm1 - bpm2) / bpm1,
    Math.abs(bpm1 - bpm2 * 2) / bpm1,
    Math.abs(bpm1 - bpm2 / 2) / bpm1,
  ];

  const minDiff = Math.min(...diffs);
  const diffPercent = minDiff * 100;

  let score: number;
  let canBeatmatch = true;

  if (diffPercent <= 0.5) {
    score = 100;
  } else if (diffPercent <= 3) {
    score = 95 - (diffPercent * 1.67);
  } else if (diffPercent <= 6) {
    score = 90 - ((diffPercent - 3) * 6.67);
  } else if (diffPercent <= 10) {
    score = 70 - ((diffPercent - 6) * 7.5);
    canBeatmatch = diffPercent <= 8;
  } else {
    score = Math.max(0, 40 - ((diffPercent - 10) * 4));
    canBeatmatch = false;
  }

  return { score, diff: diffPercent, canBeatmatch };
}

export function calculateKeyScore(
  camelot1: string | null,
  camelot2: string | null
): { score: number; compatibility: HarmonicCompatibility } {
  return calculateHarmonicScore(camelot1, camelot2);
}

export function calculateEnergyScore(
  energy1: number | null,
  energy2: number | null
): { score: number; diff: number; transition: 'smooth' | 'energy_up' | 'energy_down' } {
  if (energy1 === null || energy2 === null) {
    return { score: 70, diff: 0, transition: 'smooth' };
  }

  const diff = energy2 - energy1;
  const absDiff = Math.abs(diff);

  let score: number;
  if (absDiff <= 0.1) {
    score = 100;
  } else if (absDiff <= 0.2) {
    score = 90 - ((absDiff - 0.1) * 100);
  } else if (absDiff <= 0.3) {
    score = 80 - ((absDiff - 0.2) * 100);
  } else if (absDiff <= 0.5) {
    score = 70 - ((absDiff - 0.3) * 50);
  } else {
    score = Math.max(30, 60 - ((absDiff - 0.5) * 60));
  }

  const transition = absDiff <= 0.15 ? 'smooth' : (diff > 0 ? 'energy_up' : 'energy_down');

  return { score, diff, transition };
}

export function calculateDanceabilityScore(
  danceability1: number | null | undefined,
  danceability2: number | null | undefined
): { score: number; diff: number } | null {
  if (danceability1 == null || danceability2 == null) {
    return null;
  }

  const diff = danceability2 - danceability1;
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

  return { score, diff };
}

/**
 * Calculate overall compatibility score between two tracks
 * Uses weights from DJ_CONFIG.compatibility
 */
export function calculateCompatibility(
  track1: TrackDjData,
  track2: TrackDjData
): CompatibilityScore {
  const bpmResult = calculateBpmScore(track1.bpm, track2.bpm);
  const keyResult = calculateKeyScore(track1.camelotKey, track2.camelotKey);
  const energyResult = calculateEnergyScore(track1.energy, track2.energy);
  const danceabilityResult = calculateDanceabilityScore(track1.danceability, track2.danceability);

  // Use config weights for scoring
  const { tempoWeight, keyWeight, energyWeight } = DJ_CONFIG.compatibility;

  // Calculate overall score using config weights
  // If danceability is available, use it; otherwise distribute its weight to other factors
  let overall: number;
  if (danceabilityResult) {
    // With danceability: normalize weights to include it (takes from energy weight)
    const danceabilityWeight = energyWeight * 0.5; // Split energy weight
    const adjustedEnergyWeight = energyWeight * 0.5;
    overall = Math.round(
      bpmResult.score * tempoWeight +
      keyResult.score * keyWeight +
      energyResult.score * adjustedEnergyWeight +
      danceabilityResult.score * danceabilityWeight
    );
  } else {
    // Without danceability: use standard weights
    overall = Math.round(
      bpmResult.score * tempoWeight +
      keyResult.score * keyWeight +
      energyResult.score * energyWeight
    );
  }

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
    danceabilityScore: danceabilityResult ? Math.round(danceabilityResult.score) : null,
    bpmDiff: Math.round(bpmResult.diff * 10) / 10,
    keyCompatibility: keyResult.compatibility,
    energyDiff: Math.round(energyResult.diff * 100) / 100,
    danceabilityDiff: danceabilityResult ? Math.round(danceabilityResult.diff * 100) / 100 : null,
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
 * Delegates to centralized camelot utility
 */
export function getCompatibleCamelotKeys(camelotKey: string): string[] {
  return utilGetCompatibleKeys(camelotKey);
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

  calculateDanceabilityScore(danceability1: number | null | undefined, danceability2: number | null | undefined) {
    return calculateDanceabilityScore(danceability1, danceability2);
  }

  keyToCamelot(key: string | null): string | null {
    return keyToCamelot(key);
  }

  getCamelotColor(camelotKey: string | null): { bg: string; text: string; name: string } | null {
    return getCamelotColor(camelotKey);
  }
}
