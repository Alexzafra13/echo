import { createHash } from 'crypto';
import { normalizeForSorting } from './normalize-for-sorting';

/**
 * Generates a Persistent ID (PID) for an album
 *
 * Uses MusicBrainz Album ID if available, otherwise generates
 * a stable hash from artist + album name + year.
 *
 * This allows albums to be identified consistently even when
 * metadata changes slightly (different Unicode characters, etc.)
 */
export function generateAlbumPid(
  mbzAlbumId: string | null | undefined,
  artistId: string,
  albumName: string,
  year?: number | null,
): string {
  // If MusicBrainz ID exists, use it as PID
  if (mbzAlbumId) {
    return mbzAlbumId;
  }

  // Generate hash from normalized album info
  const normalizedName = normalizeForSorting(albumName);
  const yearStr = year ? String(year) : '';

  const input = `${artistId}:${normalizedName}:${yearStr}`;

  // Create SHA-256 hash truncated to 32 chars for readability
  const hash = createHash('sha256').update(input).digest('hex').substring(0, 32);

  return `pid-${hash}`;
}

/**
 * Generates a Persistent ID (PID) for an artist
 *
 * Uses MusicBrainz Artist ID if available, otherwise generates
 * a stable hash from the normalized artist name.
 */
export function generateArtistPid(
  mbzArtistId: string | null | undefined,
  artistName: string,
): string {
  // If MusicBrainz ID exists, use it as PID
  if (mbzArtistId) {
    return mbzArtistId;
  }

  // Generate hash from normalized artist name
  const normalizedName = normalizeForSorting(artistName);

  const hash = createHash('sha256').update(normalizedName).digest('hex').substring(0, 32);

  return `pid-${hash}`;
}
