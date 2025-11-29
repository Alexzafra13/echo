import type { Album } from '@features/home/types';
import type { ExploreAlbum } from '../services/explore.service';

/**
 * Transform ExploreAlbum to Album type for AlbumGrid compatibility
 */
export function toAlbum(exploreAlbum: ExploreAlbum): Album {
  return {
    id: exploreAlbum.id,
    title: exploreAlbum.name,
    artist: exploreAlbum.artistName || 'Artista desconocido',
    artistId: exploreAlbum.artistId || '',
    coverImage: `/api/images/albums/${exploreAlbum.id}/cover`,
    year: exploreAlbum.year || 0,
    totalTracks: exploreAlbum.songCount,
    duration: exploreAlbum.duration,
    addedAt: new Date(),
  };
}
