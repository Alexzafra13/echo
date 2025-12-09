import { useArtistMetadataSSE } from './useMetadataSSE';

/**
 * useArtistMetadataSync
 *
 * Automatically synchronizes artist metadata when updates occur via SSE.
 * Listens to `artist:images:updated` events and invalidates relevant React Query caches.
 *
 * This hook should be used in:
 * - ArtistDetailPage
 * - ArtistsPage (list view)
 * - HeroSection (if showing artist)
 * - Any component displaying artist images
 *
 * @param artistId - Optional artist ID to listen for specific artist updates only
 *
 * @example
 * ```tsx
 * function ArtistDetailPage({ artistId }: { artistId: string }) {
 *   // Auto-sync this specific artist
 *   useArtistMetadataSync(artistId);
 *
 *   const { data: artist } = useArtist(artistId);
 *   // ...
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ArtistsPage() {
 *   // Auto-sync all artists
 *   useArtistMetadataSync();
 *
 *   const { data: artists } = useArtists();
 *   // ...
 * }
 * ```
 */
export function useArtistMetadataSync(artistId?: string) {
  // Use SSE-based hook for real-time updates
  useArtistMetadataSSE(artistId);
}
