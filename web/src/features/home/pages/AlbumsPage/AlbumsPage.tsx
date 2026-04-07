import { useTranslation } from 'react-i18next';
import { Search, X, Library, Server } from 'lucide-react';
import { useDocumentTitle } from '@shared/hooks';
import { Header } from '@shared/components/layout/Header';
import { Pagination, Select } from '@shared/components/ui';
import { Sidebar, AlbumGrid } from '../../components';
import { SharedAlbumGrid } from '@features/federation';
import type { AlbumSortOption } from '../../types';
import { useAlbumFiltering } from './useAlbumFiltering';
import styles from './AlbumsPage.module.css';

/**
 * AlbumsPage Component
 * Shows all albums with pagination, inline search filtering and sort options
 * Supports both local library and shared libraries from connected servers
 */
export default function AlbumsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('albums.pageTitle'));

  const {
    page,
    searchQuery,
    sortBy,
    librarySource,
    selectedServerId,
    sharedSortBy,
    filteredAlbums,
    sharedAlbums,
    connectedServers,
    totalPages,
    sharedTotalPages,
    isLoading,
    error,
    setPage,
    setSearchQuery,
    setSortBy,
    setSelectedServerId,
    setSharedSortBy,
    handleSourceChange,
    refetchLocal,
    refetchShared,
  } = useAlbumFiltering();

  return (
    <div className={styles.albumsPage}>
      <Sidebar />

      <main className={styles.albumsPage__main}>
        <Header
          customSearch={
            <div className={styles.albumsPage__searchForm}>
              <div className={styles.albumsPage__searchWrapper}>
                <Search size={20} className={styles.albumsPage__searchIcon} />
                <input
                  type="text"
                  placeholder={
                    librarySource === 'local'
                      ? t('albums.searchPlaceholder')
                      : t('albums.searchSharedPlaceholder')
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.albumsPage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={styles.albumsPage__searchClearButton}
                    aria-label={t('albums.clearSearch')}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <div className={styles.albumsPage__content}>
          {/* Page Header */}
          <div className={styles.albumsPage__pageHeader}>
            <h1 className={styles.albumsPage__title}>
              {librarySource === 'local' ? t('albums.allAlbums') : t('albums.sharedLibraries')}
            </h1>
            <p className={styles.albumsPage__subtitle}>
              {librarySource === 'local'
                ? t('albums.exploreCollection')
                : t('albums.exploreFriends')}
            </p>
          </div>

          {/* Source Tabs */}
          {connectedServers.length > 0 && (
            <div className={styles.albumsPage__sourceTabs}>
              <div
                className={`${styles.albumsPage__sourceIndicator} ${
                  librarySource === 'shared' ? styles['albumsPage__sourceIndicator--shared'] : ''
                }`}
              />
              <button
                className={`${styles.albumsPage__sourceTab} ${librarySource === 'local' ? styles['albumsPage__sourceTab--active'] : ''}`}
                onClick={() => handleSourceChange('local')}
              >
                <Library size={18} />
                <span>{t('albums.myLibrary')}</span>
              </button>
              <button
                className={`${styles.albumsPage__sourceTab} ${librarySource === 'shared' ? styles['albumsPage__sourceTab--active'] : ''}`}
                onClick={() => handleSourceChange('shared')}
              >
                <Server size={18} />
                <span>{t('albums.shared')}</span>
                <span className={styles.albumsPage__serverCount}>{connectedServers.length}</span>
              </button>
            </div>
          )}

          {/* Local Library Content */}
          {librarySource === 'local' && (
            <>
              <Select
                label={t('albums.sortBy')}
                value={sortBy}
                onChange={(value) => setSortBy(value as AlbumSortOption)}
                options={[
                  { value: 'recent', label: t('albums.sortRecent') },
                  { value: 'alphabetical', label: t('albums.sortAlphabetical') },
                  { value: 'artist', label: t('albums.sortArtist') },
                  { value: 'recently-played', label: t('albums.sortRecentlyPlayed') },
                  { value: 'top-played', label: t('albums.sortTopPlayed') },
                  { value: 'favorites', label: t('albums.sortFavorites') },
                ]}
                className={styles.albumsPage__filterWrapper}
              />

              {!isLoading && !error && filteredAlbums.length > 0 && totalPages > 1 && (
                <div className={styles.albumsPage__paginationTop}>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    disabled={isLoading}
                  />
                </div>
              )}

              {isLoading ? (
                <div className={styles.albumsPage__loadingState}>
                  <div className={styles.albumsPage__spinner} />
                  <p>{t('albums.loadingAlbums')}</p>
                </div>
              ) : error ? (
                <div className={styles.albumsPage__errorState}>
                  <p>{t('albums.errorLoading')}</p>
                  <button onClick={refetchLocal} className={styles.albumsPage__retryButton}>
                    {t('common.retry')}
                  </button>
                </div>
              ) : filteredAlbums.length > 0 ? (
                <div className={styles.albumsPage__gridWrapper}>
                  <AlbumGrid title="" albums={filteredAlbums} mobileLayout="grid" />
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className={styles.albumsPage__emptyState}>
                  <p>{searchQuery ? t('albums.noAlbumsFound') : t('albums.noAlbumsInLibrary')}</p>
                  {!searchQuery && (
                    <p className={styles.albumsPage__emptyHint}>{t('albums.addMusicHint')}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Shared Library Content */}
          {librarySource === 'shared' && (
            <>
              <div className={styles.albumsPage__sharedFilters}>
                {connectedServers.length > 0 && (
                  <Select
                    label={t('albums.viewLibraryOf')}
                    value={selectedServerId || ''}
                    onChange={(value) => setSelectedServerId(value || undefined)}
                    options={[
                      {
                        value: '',
                        label: t('albums.allServers', { count: connectedServers.length }),
                      },
                      ...connectedServers.map((server) => ({
                        value: server.id,
                        label: `${server.name} (${server.remoteAlbumCount ?? '?'} ${t('albums.serverAlbums')})`,
                      })),
                    ]}
                  />
                )}
                <Select
                  label={t('albums.sortBy')}
                  value={sharedSortBy}
                  onChange={(value) =>
                    setSharedSortBy(value as 'default' | 'alphabetical' | 'artist')
                  }
                  options={[
                    { value: 'default', label: t('albums.sortDefault') },
                    { value: 'alphabetical', label: t('albums.sortAlphabetical') },
                    { value: 'artist', label: t('albums.sortArtist') },
                  ]}
                />
              </div>

              {selectedServerId && (
                <div className={styles.albumsPage__serverInfo}>
                  {(() => {
                    const server = connectedServers.find((s) => s.id === selectedServerId);
                    return server ? (
                      <>
                        <span className={styles.albumsPage__serverStats}>
                          {t('albums.serverStats', {
                            albums: server.remoteAlbumCount ?? 0,
                            tracks: server.remoteTrackCount ?? 0,
                            artists: server.remoteArtistCount ?? 0,
                          })}
                        </span>
                        <span
                          className={`${styles.albumsPage__serverStatus} ${server.isOnline ? styles['albumsPage__serverStatus--online'] : styles['albumsPage__serverStatus--offline']}`}
                        >
                          {server.isOnline ? t('albums.online') : t('albums.offline')}
                        </span>
                      </>
                    ) : null;
                  })()}
                </div>
              )}

              {!isLoading && !error && sharedAlbums.length > 0 && sharedTotalPages > 1 && (
                <div className={styles.albumsPage__paginationTop}>
                  <Pagination
                    currentPage={page}
                    totalPages={sharedTotalPages}
                    onPageChange={setPage}
                    disabled={isLoading}
                  />
                </div>
              )}

              {isLoading ? (
                <div className={styles.albumsPage__loadingState}>
                  <div className={styles.albumsPage__spinner} />
                  <p>{t('albums.loadingShared')}</p>
                </div>
              ) : error ? (
                <div className={styles.albumsPage__errorState}>
                  <p>{t('albums.errorLoadingShared')}</p>
                  <button onClick={refetchShared} className={styles.albumsPage__retryButton}>
                    {t('common.retry')}
                  </button>
                </div>
              ) : sharedAlbums.length > 0 ? (
                <div className={styles.albumsPage__gridWrapper}>
                  <SharedAlbumGrid
                    albums={sharedAlbums}
                    showServerBadge={!selectedServerId}
                    mobileLayout="grid"
                  />
                  <Pagination
                    currentPage={page}
                    totalPages={sharedTotalPages}
                    onPageChange={setPage}
                    disabled={isLoading}
                  />
                </div>
              ) : (
                <div className={styles.albumsPage__emptyState}>
                  <Server size={48} className={styles.albumsPage__emptyIcon} />
                  <p>{searchQuery ? t('albums.noAlbumsFound') : t('albums.noSharedAlbums')}</p>
                  <p className={styles.albumsPage__emptyHint}>{t('albums.sharedOfflineHint')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
