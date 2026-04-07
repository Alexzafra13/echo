// Colores del Camelot Wheel (estándar Mixed In Key)
export const CAMELOT_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  '1A': { bg: '#1DB4B4', text: '#FFFFFF', name: 'Teal' },
  '1B': { bg: '#14D4D4', text: '#000000', name: 'Cyan' },
  '2A': { bg: '#1DB488', text: '#FFFFFF', name: 'Sea Green' },
  '2B': { bg: '#14D49C', text: '#000000', name: 'Mint' },
  '3A': { bg: '#1DB454', text: '#FFFFFF', name: 'Green' },
  '3B': { bg: '#14D464', text: '#000000', name: 'Light Green' },
  '4A': { bg: '#5CB41D', text: '#FFFFFF', name: 'Lime' },
  '4B': { bg: '#7CD414', text: '#000000', name: 'Yellow-Green' },
  '5A': { bg: '#B4A81D', text: '#FFFFFF', name: 'Olive' },
  '5B': { bg: '#D4C814', text: '#000000', name: 'Yellow' },
  '6A': { bg: '#D47894', text: '#FFFFFF', name: 'Rose' },
  '6B': { bg: '#F490AC', text: '#000000', name: 'Pink' },
  '7A': { bg: '#9454B4', text: '#FFFFFF', name: 'Purple' },
  '7B': { bg: '#B464D4', text: '#FFFFFF', name: 'Violet' },
  '8A': { bg: '#5454B4', text: '#FFFFFF', name: 'Indigo' },
  '8B': { bg: '#6464D4', text: '#FFFFFF', name: 'Blue-Violet' },
  '9A': { bg: '#1D54B4', text: '#FFFFFF', name: 'Blue' },
  '9B': { bg: '#1464D4', text: '#FFFFFF', name: 'Azure' },
  '10A': { bg: '#1D88B4', text: '#FFFFFF', name: 'Ocean' },
  '10B': { bg: '#149CD4', text: '#000000', name: 'Sky Blue' },
  '11A': { bg: '#B41D88', text: '#FFFFFF', name: 'Magenta' },
  '11B': { bg: '#D4149C', text: '#FFFFFF', name: 'Hot Pink' },
  '12A': { bg: '#1DB4D4', text: '#000000', name: 'Turquoise' },
  '12B': { bg: '#14D4E8', text: '#000000', name: 'Aqua' },
} as const;

export const DJ_CONFIG = {
  analysis: {
    timeout: 300_000,
    workerStartupTimeout: 30_000,
    bpm: {
      min: 60,
      max: 200,
      // Umbral para corregir detección double/half-time
      doubleTimeThreshold: 200,
      halfTimeThreshold: 60,
    },
  },

  ffmpeg: {
    timeout: 5 * 60 * 1000,
    maxBuffer: 100 * 1024 * 1024,
  },

  compatibility: {
    keyWeight: 0.45,
    tempoWeight: 0.35,
    energyWeight: 0.2,
    minCompatibleScore: 0.6,
    bpmTolerancePercent: 6,
  },
} as const;

export type DjConfig = typeof DJ_CONFIG;
