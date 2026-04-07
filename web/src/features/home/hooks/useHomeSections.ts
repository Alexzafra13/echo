import { useMemo, useState } from 'react';
import type { AutoPlaylist } from '@shared/services/recommendations.service';
import { categorizeAutoPlaylists, randomSelect } from './index';
import { useIsMobile } from '@shared/hooks';
import type { Album } from '../types';

interface UseHomeSectionsParams {
  autoPlaylists?: AutoPlaylist[];
  neededAlbums: number;
  gridColumns: number;
  isMobile: boolean;
}

/** Trunca un array para que ocupe filas completas en el grid */
function truncateToFullRows<T>(
  items: T[],
  needed: number,
  columns: number,
  isMobile: boolean
): T[] {
  if (isMobile || columns <= 0) return items.slice(0, needed);
  const available = Math.min(items.length, needed);
  const fullRowItems = Math.floor(available / columns) * columns;
  return items.slice(0, fullRowItems || Math.min(items.length, columns));
}

/** Categoriza playlists de Wave Mix y trunca álbumes a filas completas */
export function useHomeSections({
  autoPlaylists,
  neededAlbums,
  gridColumns,
  isMobile,
}: UseHomeSectionsParams) {
  const [refreshKey] = useState(() => Date.now());

  const { artistMixPlaylists, genreMixPlaylists } = useMemo(() => {
    if (!autoPlaylists || autoPlaylists.length === 0) {
      return { artistMixPlaylists: [], genreMixPlaylists: [] };
    }

    const { artistPlaylists, genrePlaylists } = categorizeAutoPlaylists(autoPlaylists);
    const artistMix = randomSelect(artistPlaylists, neededAlbums);
    const genreMix = randomSelect(genrePlaylists, neededAlbums);

    return {
      artistMixPlaylists: truncateToFullRows(artistMix, neededAlbums, gridColumns, isMobile),
      genreMixPlaylists: truncateToFullRows(genreMix, neededAlbums, gridColumns, isMobile),
    };
  }, [autoPlaylists, neededAlbums, gridColumns, isMobile, refreshKey]);

  /** Trunca un array de álbumes a filas completas del grid */
  const truncateAlbums = (albums: Album[]) =>
    truncateToFullRows(albums, neededAlbums, gridColumns, isMobile);

  // Detección de móvil con resize
  const mobile = useIsMobile();

  return {
    artistMixPlaylists,
    genreMixPlaylists,
    truncateAlbums,
    isMobile: isMobile || mobile,
  };
}
