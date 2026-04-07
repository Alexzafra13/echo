/**
 * Dark gradient color palettes for UI elements like shuffle cards
 * Each palette is a tuple of [startColor, endColor] for linear gradients
 */
export const SHUFFLE_GRADIENT_PALETTES: readonly [string, string][] = [
  ['#1a1a2e', '#16213e'], // Dark blue
  ['#0f0c29', '#302b63'], // Deep purple
  ['#232526', '#414345'], // Dark gray
  ['#1e3c72', '#2a5298'], // Ocean blue
  ['#141e30', '#243b55'], // Navy
  ['#0f2027', '#203a43'], // Dark teal
  ['#2c3e50', '#4ca1af'], // Slate teal
  ['#1f1c2c', '#928dab'], // Muted purple
  ['#0b486b', '#f56217'], // Dark blue to orange
  ['#1d4350', '#a43931'], // Dark teal to red
  ['#360033', '#0b8793'], // Purple to cyan
  ['#4b134f', '#c94b4b'], // Dark magenta
  ['#373b44', '#4286f4'], // Gray to blue
  ['#134e5e', '#71b280'], // Dark green
  ['#3a1c71', '#d76d77'], // Purple to coral
] as const;

/**
 * Get a random gradient from the palettes
 */
export function getRandomGradient(): { background: string } {
  const palette = SHUFFLE_GRADIENT_PALETTES[
    Math.floor(Math.random() * SHUFFLE_GRADIENT_PALETTES.length)
  ];
  return {
    background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 100%)`,
  };
}
