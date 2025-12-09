import { useAlbumMetadataSSE } from './useMetadataSSE';

/**
 * useAlbumMetadataSync
 *
 * Automatically synchronizes album metadata when updates occur via SSE.
 * Listens to `album:cover:updated` events and invalidates relevant React Query caches.
 *
 * This hook should be used in:
 * - AlbumPage/AlbumDetailPage
 * - HomePage (album grids)
 * - ArtistDetailPage (artist's albums)
 * - HeroSection (if showing album)
 *
 * @param albumId - Optional album ID to listen for specific album updates only
 * @param artistId - Optional artist ID to also invalidate artist queries (albums affect artist pages)
 *
 * @example
 * ```tsx
 * function AlbumPage({ albumId }: { albumId: string }) {
 *   const { data: album } = useAlbum(albumId);
 *
 *   // Auto-sync this specific album
 *   useAlbumMetadataSync(albumId, album?.artistId);
 *
 *   // ...
 * }
 * ```
 *
 * @example
 * ```tsx
 * function HomePage() {
 *   // Auto-sync all albums
 *   useAlbumMetadataSync();
 *
 *   const { data: albums } = useAlbums();
 *   // ...
 * }
 * ```
 */
export function useAlbumMetadataSync(albumId?: string, artistId?: string) {
  // Use SSE-based hook for real-time updates
  useAlbumMetadataSSE(albumId, artistId);
}
