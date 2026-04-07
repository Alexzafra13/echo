import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { RefreshCw, Sparkles, Search, X, ArrowLeft, Mic2 } from 'lucide-react';
import { Sidebar } from '@shared/components/layout/Sidebar';
import { Header } from '@shared/components/layout/Header';
import { Button, Pagination } from '@shared/components/ui';
import { PlaylistCover } from '../../components/PlaylistCover';
import {
  getArtistPlaylistsPaginated,
  type AutoPlaylist,
} from '@shared/services/recommendations.service';
import { useAuthStore } from '@shared/store';
import { logger } from '@shared/utils/logger';
import { safeSessionStorage } from '@shared/utils/safeSessionStorage';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import styles from './ArtistPlaylistsPage.module.css';

/**
 * ArtistPlaylistsPage Component
 * Muestra una cuadrícula paginada de playlists basadas en artistas
 */
export function ArtistPlaylistsPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const user = useAuthStore((state) => state.user);

  const [playlists, setPlaylists] = useState<AutoPlaylist[]>([]);
  const [allPlaylists, setAllPlaylists] = useState<AutoPlaylist[]>([]); // Almacenar todas las playlists para búsqueda
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 12;

  const loadPlaylists = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const data = await getArtistPlaylistsPaginated(skip, ITEMS_PER_PAGE);

      setPlaylists(data.playlists);
      setAllPlaylists(data.playlists);
      setTotal(data.total);
      setCurrentPage(page);
    } catch (err) {
      logger.error('[ArtistPlaylists] Failed to load:', err);
      setError(getApiErrorMessage(err, 'Error al cargar las playlists de artistas'));
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar playlists según la búsqueda
  const filteredPlaylists = searchQuery.trim()
    ? allPlaylists.filter(
        (playlist) =>
          playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          playlist.metadata.artistName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : playlists;

  useEffect(() => {
    loadPlaylists(1);
  }, []);

  const handlePlaylistClick = (playlist: AutoPlaylist) => {
    safeSessionStorage.setItem('currentPlaylist', JSON.stringify(playlist));
    safeSessionStorage.setItem('playlistReturnPath', '/artist-playlists');
    setLocation(`/wave-mix/${playlist.id}`);
  };

  const handlePageChange = (newPage: number) => {
    loadPlaylists(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setLocation('/wave-mix');
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className={styles.artistPlaylistsPage}>
      <Sidebar />

      <main className={styles.artistPlaylistsPage__main}>
        <Header
          customSearch={
            <div className={styles.artistPlaylistsPage__searchForm}>
              <div className={styles.artistPlaylistsPage__searchWrapper}>
                <Search size={20} className={styles.artistPlaylistsPage__searchIcon} />
                <input
                  type="text"
                  placeholder={t('recommendations.searchArtistPlaylists')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.artistPlaylistsPage__searchInput}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={styles.artistPlaylistsPage__searchClearButton}
                    aria-label={t('recommendations.clearSearch')}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <div className={styles.artistPlaylistsPage__content}>
          {/* Back Button */}
          <Button variant="ghost" onClick={handleBack} className={styles.backButton}>
            <ArrowLeft size={20} />
            {t('common.back')}
          </Button>

          {/* Hero Section */}
          <div className={styles.artistPlaylistsPage__hero}>
            <div className={styles.artistPlaylistsPage__heroContent}>
              <div className={styles.artistPlaylistsPage__heroText}>
                <h1 className={styles.artistPlaylistsPage__heroTitle}>
                  {t('recommendations.artistPlaylistsTitle')}
                </h1>
                <p className={styles.artistPlaylistsPage__heroDescription}>
                  {t('recommendations.artistPlaylistsSubtitle', {
                    name: user?.name || user?.username || 'ti',
                  })}
                </p>
                {total > 0 && (
                  <p className={styles.artistPlaylistsPage__heroMeta}>
                    {t('recommendations.artistCount', { count: total })}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={() => loadPlaylists(currentPage)}
                disabled={isLoading}
                className={styles.artistPlaylistsPage__refreshButton}
              >
                <RefreshCw size={18} className={isLoading ? styles.spinning : ''} />
                {t('recommendations.update')}
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={styles.artistPlaylistsPage__loading}>
              <div className={styles.artistPlaylistsPage__loadingSpinner}>
                <Sparkles size={48} className={styles.spinning} />
              </div>
              <p>{t('recommendations.loadingArtistPlaylists')}</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className={styles.artistPlaylistsPage__error}>
              <p>{error}</p>
              <Button variant="secondary" onClick={() => loadPlaylists(currentPage)}>
                {t('common.tryAgain')}
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && playlists.length === 0 && (
            <div className={styles.artistPlaylistsPage__emptyState}>
              <Mic2 size={64} />
              <h2>{t('recommendations.noArtistPlaylists')}</h2>
              <p>{t('recommendations.noArtistPlaylistsHint')}</p>
            </div>
          )}

          {/* Top Pagination - Mobile Only */}
          {!isLoading && !error && playlists.length > 0 && totalPages > 1 && (
            <div className={styles.artistPlaylistsPage__paginationTop}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Playlists Grid */}
          {!isLoading && !error && filteredPlaylists.length > 0 && (
            <div className={styles.artistPlaylistsPage__gridWrapper}>
              <div className={styles.artistPlaylistsPage__grid}>
                {filteredPlaylists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className={styles.playlistCard}
                    onClick={() => handlePlaylistClick(playlist)}
                  >
                    <PlaylistCover
                      type={playlist.type}
                      name={playlist.name}
                      coverColor={playlist.coverColor}
                      coverImageUrl={playlist.coverImageUrl}
                      artistName={playlist.metadata.artistName}
                      size="responsive"
                    />
                    <div className={styles.playlistCard__info}>
                      <h3 className={styles.playlistCard__name}>{playlist.name}</h3>
                      <p className={styles.playlistCard__description}>{playlist.description}</p>
                      <div className={styles.playlistCard__meta}>
                        <span>
                          {t('playlists.songs', { count: playlist.metadata.totalTracks })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
