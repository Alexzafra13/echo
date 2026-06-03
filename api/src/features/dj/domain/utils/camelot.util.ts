/**
 * Utilidades de la rueda de Camelot para mezcla armónica. La rueda coloca las
 * tonalidades en un círculo (1-12): columna A = menores, B = mayores. Números
 * adyacentes (±1) son compatibles, y el mismo número con distinta letra es el
 * relativo mayor/menor.
 */

export interface CamelotParsed {
  number: number;
  letter: 'A' | 'B';
}

// Tonalidad → notación Camelot, con enarmónicos (G#m y Abm → 1A)
const KEY_TO_CAMELOT: Record<string, CamelotParsed> = {
  // Menores (columna A)
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

  // Mayores (columna B)
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

// Camelot → tonalidad canónica
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

// Tonalidad → "8A" (null si no es válida)
export function keyToCamelot(key: string | null | undefined): string | null {
  if (!key || key === 'Unknown') return null;
  const camelot = KEY_TO_CAMELOT[key];
  if (!camelot) return null;
  return `${camelot.number}${camelot.letter}`;
}

// "8A" → tonalidad (null si no es válida)
export function camelotToKey(camelot: string | null | undefined): string | null {
  if (!camelot) return null;
  return CAMELOT_TO_KEY[camelot] ?? null;
}

// Separa "8A" en número y letra
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

export function formatCamelot(parsed: CamelotParsed): string {
  return `${parsed.number}${parsed.letter}`;
}

/**
 * Tonalidades compatibles según la rueda: la misma, su relativo (mismo número,
 * otra letra) y ±1 (cambio de energía, mismo modo).
 */
export function getCompatibleCamelotKeys(camelotKey: string): string[] {
  const parsed = parseCamelot(camelotKey);
  if (!parsed) return [];

  const { number, letter } = parsed;
  const compatible: string[] = [];

  // la misma
  compatible.push(camelotKey);

  // relativo mayor/menor
  compatible.push(`${number}${letter === 'A' ? 'B' : 'A'}`);

  // +1 en la rueda (12 → 1)
  const plus1 = number === 12 ? 1 : number + 1;
  compatible.push(`${plus1}${letter}`);

  // -1 en la rueda (1 → 12)
  const minus1 = number === 1 ? 12 : number - 1;
  compatible.push(`${minus1}${letter}`);

  return compatible;
}

// ¿Dos tonalidades Camelot son compatibles para mezcla armónica?
export function areKeysCompatible(key1: string | null | undefined, key2: string | null | undefined): boolean {
  if (!key1 || !key2) return false;

  const parsed1 = parseCamelot(key1);
  const parsed2 = parseCamelot(key2);

  if (!parsed1 || !parsed2) return false;

  // misma
  if (key1 === key2) return true;

  // relativo mayor/menor
  if (parsed1.number === parsed2.number && parsed1.letter !== parsed2.letter) {
    return true;
  }

  // adyacentes en la rueda (mismo modo)
  if (parsed1.letter === parsed2.letter) {
    const diff = Math.abs(parsed1.number - parsed2.number);
    // 1 = adyacente, 11 = vuelta (1 y 12)
    if (diff === 1 || diff === 11) return true;
  }

  return false;
}

// Distancia circular en la rueda (0-6)
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
 * Puntúa la compatibilidad armónica entre dos tonalidades Camelot:
 * misma = 100; ±1 mismo modo = 90; relativo = 85; ±1 distinto modo = 75;
 * ±2 = 55; resto = 20-40.
 */
export function calculateHarmonicScore(
  camelot1: string | null | undefined,
  camelot2: string | null | undefined
): HarmonicScoreResult {
  if (!camelot1 || !camelot2) {
    return { score: 50, compatibility: 'compatible' }; // desconocida, neutral
  }

  const c1 = parseCamelot(camelot1);
  const c2 = parseCamelot(camelot2);

  if (!c1 || !c2) {
    return { score: 50, compatibility: 'compatible' };
  }

  // misma
  if (c1.number === c2.number && c1.letter === c2.letter) {
    return { score: 100, compatibility: 'perfect' };
  }

  const distance = getCamelotDistance(c1.number, c2.number);
  const sameMode = c1.letter === c2.letter;

  // relativo mayor/menor
  if (distance === 0) {
    return { score: 85, compatibility: 'compatible' };
  }

  // adyacente (±1)
  if (distance === 1) {
    if (sameMode) {
      return { score: 90, compatibility: 'energy_boost' };
    }
    return { score: 75, compatibility: 'compatible' };
  }

  // a dos pasos (±2)
  if (distance === 2) {
    return { score: 55, compatibility: 'compatible' };
  }

  // incompatible: baja con la distancia
  const score = Math.max(20, 50 - distance * 5);
  return { score, compatibility: 'incompatible' };
}

// Score armónico simple (0-100) para ordenar
export function getSimpleHarmonicScore(
  camelot1: string | null | undefined,
  camelot2: string | null | undefined
): number {
  return calculateHarmonicScore(camelot1, camelot2).score;
}

// BPM válido (30-300)
export function isValidBpm(bpm: number | null | undefined): bpm is number {
  return typeof bpm === 'number' && bpm >= 30 && bpm <= 300;
}

// Energía válida (0-1)
export function isValidEnergy(energy: number | null | undefined): energy is number {
  return typeof energy === 'number' && energy >= 0 && energy <= 1;
}

// Formato Camelot válido
export function isValidCamelotKey(camelot: string | null | undefined): camelot is string {
  if (!camelot) return false;
  return parseCamelot(camelot) !== null;
}
