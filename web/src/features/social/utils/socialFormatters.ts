/**
 * Social feature formatters and helpers
 * Centralizes text formatting, icons, and URL generation for social activities
 */

export type SocialActionType =
  | 'created_playlist'
  | 'played_track'
  | 'became_friends';

export type TargetType = 'playlist' | 'album' | 'track' | 'artist';

/**
 * Gets the human-readable text for a social action type
 *
 * @param actionType - The type of social action
 * @returns Localized action text in Spanish
 *
 * @example
 * getActionText('created_playlist') // "creó la playlist"
 * getActionText('played_track') // "escuchó"
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
 * Gets the emoji icon for a social action type
 *
 * @param actionType - The type of social action
 * @returns Emoji representing the action
 *
 * @example
 * getActionIcon('created_playlist') // "📋"
 * getActionIcon('played_track') // "🎵"
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
 * Generates the URL for a social activity target
 *
 * @param targetType - Type of the target (playlist, album, track, artist)
 * @param targetId - ID of the target
 * @param albumId - Optional album ID for tracks (since tracks don't have their own page)
 * @returns URL path or null if not navigable
 *
 * @example
 * getTargetUrl('album', '123') // "/album/123"
 * getTargetUrl('track', '456', '789') // "/album/789"
 * getTargetUrl('track', '456') // null
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
      // Tracks don't have their own page, navigate to album instead
      return albumId ? `/album/${albumId}` : null;
    case 'artist':
      return `/artists/${targetId}`;
    default:
      return null;
  }
}

/**
 * Determines if an activity type should show a cover image
 *
 * @param actionType - The type of social action
 * @returns Whether to show cover for this action type
 */
export function shouldShowCover(actionType: string): boolean {
  return actionType !== 'became_friends';
}

/**
 * Gets the CSS class suffix for the number of album covers in a mosaic
 *
 * @param count - Number of album covers
 * @returns CSS class suffix for the mosaic layout
 */
export function getMosaicClass(count: number): string {
  if (count === 1) return 'single';
  if (count === 2) return '2';
  if (count === 3) return '3';
  return '4';
}
