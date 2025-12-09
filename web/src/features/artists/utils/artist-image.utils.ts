import { getArtistImageUrl } from '@features/home/hooks';

/**
 * Get artist avatar URL (V2 - unified profile image)
 * Constructs dynamic URL to ImageService API endpoint.
 *
 * @param artistId - The artist ID
 * @param tag - Optional MD5 tag for cache validation (from useArtistImages metadata)
 *
 * Note: For list views without tag, SSE sync ensures cache invalidation
 * when images are updated. For detail views, use useArtistImages() to get tag.
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
