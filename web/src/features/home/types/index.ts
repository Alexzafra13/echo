export type {
  Album,
  AlbumCardProps,
  AlbumGridProps,
  HeroSectionProps,
  HeroAlbumData,
  HeroItem,
  AlbumSortOption,
  AlbumsAlphabeticalResponse,
  AlbumsByArtistResponse,
  AlbumsRecentlyPlayedResponse,
  AlbumsFavoritesResponse,
} from './album.types';

export { isHeroAlbum, isHeroPlaylist } from './album.types';

export type { Track } from '@shared/types/track.types';
export { formatDuration } from '@shared/types/track.types';
