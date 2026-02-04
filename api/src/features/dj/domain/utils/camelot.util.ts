/**
 * Camelot Wheel Utility
 *
 * Centralized utility for all Camelot wheel operations used in harmonic mixing.
 * The Camelot wheel is a visual representation of musical keys that helps DJs
 * find harmonically compatible tracks for smooth transitions.
 *
 * Wheel structure:
 * - Numbers 1-12 arranged in a circle
 * - Column A = minor keys
 * - Column B = major keys
 * - Adjacent numbers (±1) are harmonically compatible
 * - Same number, different letter (A↔B) = relative major/minor
 */

export interface CamelotParsed {
  number: number;
  letter: 'A' | 'B';
}

/**
 * Complete mapping from musical keys to Camelot notation
 * Includes all enharmonic equivalents (e.g., G#m and Abm both map to 1A)
 */
const KEY_TO_CAMELOT: Record<string, CamelotParsed> = {
  // Minor keys (A column)
  'Abm': { number: 1, letter: 'A' }, 'G#m': { number: 1, letter: 'A' },
  'Ebm': { number: 2, letter: 'A' }, 'D#m': { number: 2, letter: 'A' },
  'Bbm': { number: 3, letter: 'A' }, 'A#m': { number: 3, letter: 'A' },
  'Fm': { number: 4, letter: 'A' },
  'Cm': { number: 5, letter: 'A' },
  'Gm': { number: 6, letter: 'A' },
  'Dm': { number: 7, letter: 'A' },
  'Am': { number: 8, letter: 'A' },
  'Em': { number: 9, letter: 'A' },
  'Bm': { number: 10, letter: 'A' },
  'F#m': { number: 11, letter: 'A' }, 'Gbm': { number: 11, letter: 'A' },
  'C#m': { number: 12, letter: 'A' }, 'Dbm': { number: 12, letter: 'A' },

  // Major keys (B column)
  'B': { number: 1, letter: 'B' }, 'Cb': { number: 1, letter: 'B' },
  'F#': { number: 2, letter: 'B' }, 'Gb': { number: 2, letter: 'B' },
  'C#': { number: 3, letter: 'B' }, 'Db': { number: 3, letter: 'B' },
  'Ab': { number: 4, letter: 'B' }, 'G#': { number: 4, letter: 'B' },
  'Eb': { number: 5, letter: 'B' }, 'D#': { number: 5, letter: 'B' },
  'Bb': { number: 6, letter: 'B' }, 'A#': { number: 6, letter: 'B' },
  'F': { number: 7, letter: 'B' },
  'C': { number: 8, letter: 'B' },
  'G': { number: 9, letter: 'B' },
  'D': { number: 10, letter: 'B' },
  'A': { number: 11, letter: 'B' },
  'E': { number: 12, letter: 'B' },
};

/**
 * Reverse mapping from Camelot notation to canonical musical key
 */
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

/**
 * Convert a musical key to Camelot notation string
 * @param key Musical key (e.g., "Am", "C#m", "G")
 * @returns Camelot notation (e.g., "8A", "12A", "9B") or null if invalid
 */
export function keyToCamelot(key: string | null | undefined): string | null {
  if (!key || key === 'Unknown') return null;
  const camelot = KEY_TO_CAMELOT[key];
  if (!camelot) return null;
  return `${camelot.number}${camelot.letter}`;
}

/**
 * Convert Camelot notation to musical key
 * @param camelot Camelot notation (e.g., "8A", "9B")
 * @returns Musical key (e.g., "Am", "G") or null if invalid
 */
export function camelotToKey(camelot: string | null | undefined): string | null {
  if (!camelot) return null;
  return CAMELOT_TO_KEY[camelot] ?? null;
}

/**
 * Parse Camelot notation into number and letter components
 * @param camelot Camelot notation (e.g., "8A", "12B")
 * @returns Parsed object or null if invalid
 */
export function parseCamelot(camelot: string): CamelotParsed | null {
  const match = camelot.match(/^(\d{1,2})([AB])$/);
  if (!match) return null;

  const number = parseInt(match[1], 10);
  if (number < 1 || number > 12) return null;

  return {
    number,
    letter: match[2] as 'A' | 'B',
  };
}

/**
 * Format CamelotParsed back to string notation
 */
export function formatCamelot(parsed: CamelotParsed): string {
  return `${parsed.number}${parsed.letter}`;
}

/**
 * Get all harmonically compatible Camelot keys for a given key
 *
 * Compatible keys follow the Camelot wheel rules:
 * - Same key (perfect match)
 * - Same number, opposite letter (relative major/minor)
 * - ±1 on the wheel (energy change, same mode)
 *
 * @param camelotKey Source Camelot key (e.g., "8A")
 * @returns Array of compatible Camelot keys
 */
export function getCompatibleCamelotKeys(camelotKey: string): string[] {
  const parsed = parseCamelot(camelotKey);
  if (!parsed) return [];

  const { number, letter } = parsed;
  const compatible: string[] = [];

  // Same key (perfect match)
  compatible.push(camelotKey);

  // Same number, opposite letter (relative major/minor)
  compatible.push(`${number}${letter === 'A' ? 'B' : 'A'}`);

  // +1 on wheel (same letter) - wraps 12 → 1
  const plus1 = number === 12 ? 1 : number + 1;
  compatible.push(`${plus1}${letter}`);

  // -1 on wheel (same letter) - wraps 1 → 12
  const minus1 = number === 1 ? 12 : number - 1;
  compatible.push(`${minus1}${letter}`);

  return compatible;
}

/**
 * Check if two Camelot keys are harmonically compatible
 * @param key1 First Camelot key
 * @param key2 Second Camelot key
 * @returns true if compatible for harmonic mixing
 */
export function areKeysCompatible(key1: string | null | undefined, key2: string | null | undefined): boolean {
  if (!key1 || !key2) return false;

  const parsed1 = parseCamelot(key1);
  const parsed2 = parseCamelot(key2);

  if (!parsed1 || !parsed2) return false;

  // Same key
  if (key1 === key2) return true;

  // Same number, different letter (relative major/minor)
  if (parsed1.number === parsed2.number && parsed1.letter !== parsed2.letter) {
    return true;
  }

  // Adjacent numbers on the wheel (same letter)
  if (parsed1.letter === parsed2.letter) {
    const diff = Math.abs(parsed1.number - parsed2.number);
    // diff === 1 for adjacent, diff === 11 for wrap-around (1 and 12)
    if (diff === 1 || diff === 11) return true;
  }

  return false;
}

/**
 * Calculate the circular distance on the Camelot wheel
 * @param num1 First number (1-12)
 * @param num2 Second number (1-12)
 * @returns Shortest distance on the circular wheel (0-6)
 */
export function getCamelotDistance(num1: number, num2: number): number {
  const directDiff = Math.abs(num1 - num2);
  return Math.min(directDiff, 12 - directDiff);
}

export type HarmonicCompatibility = 'perfect' | 'compatible' | 'energy_boost' | 'incompatible';

export interface HarmonicScoreResult {
  score: number; // 0-100
  compatibility: HarmonicCompatibility;
}

/**
 * Calculate detailed harmonic compatibility score between two Camelot keys
 *
 * Scoring:
 * - Same key = 100 (perfect)
 * - ±1 on wheel, same letter = 90 (energy boost/change)
 * - Same number, different letter = 85 (relative major/minor)
 * - ±1 on wheel, different letter = 75 (compatible with mood shift)
 * - ±2 on wheel = 55 (noticeable but usable)
 * - Other = 20-40 (incompatible)
 *
 * @param camelot1 First Camelot key
 * @param camelot2 Second Camelot key
 * @returns Score and compatibility level
 */
export function calculateHarmonicScore(
  camelot1: string | null | undefined,
  camelot2: string | null | undefined
): HarmonicScoreResult {
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

  const distance = getCamelotDistance(c1.number, c2.number);
  const sameMode = c1.letter === c2.letter;

  // Same number, different letter (relative major/minor)
  if (distance === 0) {
    return { score: 85, compatibility: 'compatible' };
  }

  // Adjacent on wheel (±1)
  if (distance === 1) {
    if (sameMode) {
      return { score: 90, compatibility: 'energy_boost' };
    }
    return { score: 75, compatibility: 'compatible' };
  }

  // Two steps away (±2)
  if (distance === 2) {
    return { score: 55, compatibility: 'compatible' };
  }

  // Incompatible - score decreases with distance
  const score = Math.max(20, 50 - distance * 5);
  return { score, compatibility: 'incompatible' };
}

/**
 * Get a simplified harmonic score (0-100) for sorting purposes
 */
export function getSimpleHarmonicScore(
  camelot1: string | null | undefined,
  camelot2: string | null | undefined
): number {
  return calculateHarmonicScore(camelot1, camelot2).score;
}

/**
 * Validate BPM value
 * @param bpm BPM value to validate
 * @returns true if BPM is within reasonable range (30-300)
 */
export function isValidBpm(bpm: number | null | undefined): bpm is number {
  return typeof bpm === 'number' && bpm >= 30 && bpm <= 300;
}

/**
 * Validate energy value
 * @param energy Energy value to validate
 * @returns true if energy is within range (0-1)
 */
export function isValidEnergy(energy: number | null | undefined): energy is number {
  return typeof energy === 'number' && energy >= 0 && energy <= 1;
}

/**
 * Validate Camelot key format
 * @param camelot Camelot notation to validate
 * @returns true if valid Camelot format
 */
export function isValidCamelotKey(camelot: string | null | undefined): camelot is string {
  if (!camelot) return false;
  return parseCamelot(camelot) !== null;
}
