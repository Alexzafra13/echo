import { useState, useEffect, useMemo } from 'react';
import { useSearch, useLocation } from 'wouter';
import {
  useRecentAlbums,
  useTopPlayedAlbums,
  useAlbumsAlphabetically,
  useAlbumsByArtist,
  useAlbumsRecentlyPlayed,
  useAlbumsFavorites,
  useAlbumSearch,
} from '../../hooks/useAlbums';
import { useGridDimensions } from '../../hooks/useGridDimensions';
import { useSharedAlbums, useConnectedServers } from '@features/federation';
import type { AlbumSortOption, Album } from '../../types';

type LibrarySource = 'local' | 'shared';

export function useAlbumFiltering() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const sourceParam = searchParams.get('source');

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<AlbumSortOption>('recent');
  const [librarySource, setLibrarySource] = useState<LibrarySource>(
    sourceParam === 'shared' ? 'shared' : 'local'
  );
  const [selectedServerId, setSelectedServerId] = useState<string | undefined>();
  const [sharedSortBy, setSharedSortBy] = useState<'default' | 'alphabetical' | 'artist'>(
    'default'
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { itemsPerPage } = useGridDimensions({ headerHeight: 260 });
  const { data: connectedServers = [] } = useConnectedServers();

  // Shared albums query
  const sharedAlbumsQuery = useSharedAlbums({
    page,
    limit: itemsPerPage,
    search: debouncedSearchQuery || undefined,
    serverId: selectedServerId,
  });

  // Local queries
  const recentQuery = useRecentAlbums(itemsPerPage);
  const alphabeticalQuery = useAlbumsAlphabetically({ page, limit: itemsPerPage });
  const byArtistQuery = useAlbumsByArtist({ page, limit: itemsPerPage });
  const recentlyPlayedQuery = useAlbumsRecentlyPlayed(itemsPerPage);
  const topPlayedQuery = useTopPlayedAlbums(itemsPerPage);
  const favoritesQuery = useAlbumsFavorites({ page, limit: itemsPerPage });

  // Active query selector
  let activeQuery;
  let allAlbums: Album[];
  let totalPages = 1;

  switch (sortBy) {
    case 'alphabetical':
      activeQuery = alphabeticalQuery;
      allAlbums = alphabeticalQuery.data?.data || [];
      totalPages = alphabeticalQuery.data?.totalPages || 1;
      break;
    case 'artist':
      activeQuery = byArtistQuery;
      allAlbums = byArtistQuery.data?.data || [];
      totalPages = byArtistQuery.data?.totalPages || 1;
      break;
    case 'recently-played':
      activeQuery = recentlyPlayedQuery;
      allAlbums = recentlyPlayedQuery.data?.data || [];
      totalPages = 1;
      break;
    case 'top-played':
      activeQuery = topPlayedQuery;
      allAlbums = topPlayedQuery.data || [];
      totalPages = 1;
      break;
    case 'favorites':
      activeQuery = favoritesQuery;
      allAlbums = favoritesQuery.data?.data || [];
      totalPages = favoritesQuery.data?.hasMore ? page + 1 : page;
      break;
    case 'recent':
    default:
      activeQuery = recentQuery;
      allAlbums = recentQuery.data || [];
      totalPages = 1;
      break;
  }

  // Busqueda server-side cuando hay query (evita filtrar client-side sobre 1 pagina)
  const searchQuery_trimmed = debouncedSearchQuery.trim();
  const searchResults = useAlbumSearch(searchQuery_trimmed);
  const isSearching = searchQuery_trimmed.length >= 2;

  const isLoading =
    librarySource === 'local'
      ? isSearching
        ? searchResults.isLoading
        : activeQuery.isLoading
      : sharedAlbumsQuery.isLoading;
  const error =
    librarySource === 'local'
      ? isSearching
        ? searchResults.error
        : activeQuery.error
      : sharedAlbumsQuery.error;

  // Si hay busqueda activa, usar resultados server-side; si no, usar la query paginada
  const filteredAlbums = useMemo(
    () => (isSearching && searchResults.data ? searchResults.data : allAlbums),
    [isSearching, searchResults.data, allAlbums]
  );

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [sortBy, itemsPerPage, librarySource, selectedServerId, debouncedSearchQuery]);

  const handleSourceChange = (source: LibrarySource) => {
    setLibrarySource(source);
    setSearchQuery('');
    setLocation(source === 'shared' ? '/albums?source=shared' : '/albums');
  };

  // Shared albums data
  const rawSharedAlbums = sharedAlbumsQuery.data?.albums || [];
  const sharedTotal = sharedAlbumsQuery.data?.total || 0;
  const sharedTotalPages =
    sharedAlbumsQuery.data?.totalPages || Math.ceil(sharedTotal / itemsPerPage) || 1;

  const sharedAlbums = useMemo(
    () =>
      [...rawSharedAlbums].sort((a, b) => {
        if (sharedSortBy === 'alphabetical') return a.name.localeCompare(b.name);
        if (sharedSortBy === 'artist') return a.artistName.localeCompare(b.artistName);
        return 0;
      }),
    [rawSharedAlbums, sharedSortBy]
  );

  return {
    // State
    page,
    searchQuery,
    sortBy,
    librarySource,
    selectedServerId,
    sharedSortBy,
    // Data
    filteredAlbums,
    sharedAlbums,
    connectedServers,
    totalPages,
    sharedTotalPages,
    isLoading,
    error,
    // Actions
    setPage,
    setSearchQuery,
    setSortBy,
    setSelectedServerId,
    setSharedSortBy,
    handleSourceChange,
    refetchLocal: () => activeQuery.refetch(),
    refetchShared: () => sharedAlbumsQuery.refetch(),
  };
}
