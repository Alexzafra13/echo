/**
 * Formateadores y helpers del módulo social.
 * Centraliza formateo de texto, iconos y generación de URLs para actividades sociales.
 */

export type SocialActionType =
  | 'created_playlist'
  | 'played_track'
  | 'became_friends';

export type TargetType = 'playlist' | 'album' | 'track' | 'artist';

/**
 * Devuelve el texto legible para un tipo de acción social.
 */
export function getActionText(actionType: string): string {
  const actionTexts: Record<string, string> = {
    created_playlist: 'creó la playlist',
    played_track: 'escuchó',
    became_friends: 'ahora es amigo de',
  };

  return actionTexts[actionType] ?? actionType;
}

/**
 * Devuelve el emoji correspondiente a un tipo de acción social.
 */
export function getActionIcon(actionType: string): string {
  const actionIcons: Record<string, string> = {
    created_playlist: '📋',
    played_track: '🎵',
    became_friends: '🤝',
  };

  return actionIcons[actionType] ?? '•';
}

/**
 * Genera la URL para el objetivo de una actividad social.
 * Los tracks no tienen página propia, se redirige al álbum.
 */
export function getTargetUrl(
  targetType: string,
  targetId: string,
  albumId?: string
): string | null {
  switch (targetType) {
    case 'playlist':
      return `/playlists/${targetId}`;
    case 'album':
      return `/album/${targetId}`;
    case 'track':
      // Los tracks no tienen página propia, navegar al álbum
      return albumId ? `/album/${albumId}` : null;
    case 'artist':
      return `/artists/${targetId}`;
    default:
      return null;
  }
}

/**
 * Determina si un tipo de actividad debe mostrar imagen de portada.
 */
export function shouldShowCover(actionType: string): boolean {
  return actionType !== 'became_friends';
}

/**
 * Devuelve el sufijo de clase CSS según el número de portadas del mosaico.
 */
export function getMosaicClass(count: number): string {
  if (count === 1) return 'single';
  if (count === 2) return '2';
  if (count === 3) return '3';
  return '4';
}
