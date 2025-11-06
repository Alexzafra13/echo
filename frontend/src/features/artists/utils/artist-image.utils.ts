import { getArtistImageUrl } from '@features/home/hooks';

/**
 * Get artist avatar URL
 * Returns the appropriate size image URL or a fallback
 */
export function getArtistAvatarUrl(artistId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const imageTypeMap = {
    small: 'profile-small',
    medium: 'profile-medium',
    large: 'profile-large',
  };

  return getArtistImageUrl(artistId, imageTypeMap[size]);
}

/**
 * Fallback for artist image error
 * Returns a placeholder URL or hides the image
 */
export function handleArtistImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.target as HTMLImageElement;
  // Use a simple colored circle with initials as fallback
  target.style.display = 'none';
  const fallbackDiv = target.nextElementSibling;
  if (fallbackDiv instanceof HTMLElement) {
    fallbackDiv.style.display = 'flex';
  }
}

/**
 * Get initials from artist name
 */
export function getArtistInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
