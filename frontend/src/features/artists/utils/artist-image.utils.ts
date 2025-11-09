import { getArtistImageUrl } from '@features/home/hooks';

/**
 * Get artist avatar URL (V2 - unified profile image)
 * @param artistId - The artist ID
 * @param tag - Optional tag for cache validation
 * @deprecated size parameter - V2 uses single unified profile image
 */
export function getArtistAvatarUrl(artistId: string, tag?: string): string {
  return getArtistImageUrl(artistId, 'profile', tag);
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
