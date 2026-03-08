/**
 * Server color options for federation
 * Each color has a name, hex value, and RGB components for opacity-based styling
 */
export interface ServerColor {
  name: string;
  label: string;
  hex: string;
  rgb: string; // "r, g, b" format for rgba()
}

export const SERVER_COLORS: ServerColor[] = [
  { name: 'purple', label: 'Morado', hex: '#8b5cf6', rgb: '139, 92, 246' },
  { name: 'indigo', label: 'Índigo', hex: '#6366f1', rgb: '99, 102, 241' },
  { name: 'blue', label: 'Azul', hex: '#3b82f6', rgb: '59, 130, 246' },
  { name: 'cyan', label: 'Cian', hex: '#06b6d4', rgb: '6, 182, 212' },
  { name: 'orange', label: 'Naranja', hex: '#f97316', rgb: '249, 115, 22' },
  { name: 'amber', label: 'Ámbar', hex: '#f59e0b', rgb: '245, 158, 11' },
  { name: 'rose', label: 'Rosa', hex: '#ec4899', rgb: '236, 72, 153' },
  { name: 'fuchsia', label: 'Fucsia', hex: '#d946ef', rgb: '217, 70, 239' },
  { name: 'red', label: 'Rojo', hex: '#ef4444', rgb: '239, 68, 68' },
];

/**
 * Get color config by name. Falls back to purple if not found.
 */
export function getServerColor(colorName?: string): ServerColor {
  return SERVER_COLORS.find((c) => c.name === colorName) ?? SERVER_COLORS[0];
}

/**
 * Get CSS custom property style object for a given server color
 */
export function getServerColorStyle(colorName?: string): React.CSSProperties {
  const color = getServerColor(colorName);
  return {
    '--server-color': color.hex,
    '--server-color-rgb': color.rgb,
  } as React.CSSProperties;
}
