import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves, RefreshCw, Sparkles } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
import { PlaylistCover } from '../../components/PlaylistCover';
import { getAutoPlaylists, type AutoPlaylist } from '@shared/services/recommendations.service';
import styles from './WaveMixPage.module.css';

/**
 * WaveMixPage Component
 * Displays a grid of auto-generated playlists (Wave Mix + Artist playlists)
 */
export function WaveMixPage() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<AutoPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlaylists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAutoPlaylists();
      console.log('[WaveMix] Received playlists:', data);
      setPlaylists(data);
    } catch (err: any) {
      console.error('[WaveMix] Failed to load:', err);
      setError(err.response?.data?.message || 'Error al cargar las playlists');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handlePlaylistClick = (playlist: AutoPlaylist) => {
    // Navigate to individual playlist page
    navigate(`/wave-mix/${playlist.id}`, { state: { playlist } });
  };

  const handleRefresh = () => {
    loadPlaylists();
  };

  return (
    <div className={styles.waveMixPage}>
      <Sidebar />

      <main className={styles.waveMixPage__main}>
        <Header />

        <div className={styles.waveMixPage__content}>
          {/* Hero Section */}
          <div className={styles.waveMixPage__hero}>
            <div className={styles.waveMixPage__heroIcon}>
              <Waves size={48} />
            </div>
            <div className={styles.waveMixPage__heroInfo}>
              <h1 className={styles.waveMixPage__heroTitle}>Wave Mix</h1>
              <p className={styles.waveMixPage__heroDescription}>
                Playlists personalizadas creadas automáticamente para ti
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isLoading}
              className={styles.waveMixPage__refreshButton}
            >
              <RefreshCw size={18} className={isLoading ? styles.spinning : ''} />
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={styles.waveMixPage__loading}>
              <div className={styles.waveMixPage__loadingSpinner}>
                <Sparkles size={48} className={styles.spinning} />
              </div>
              <p>Generando tus playlists personalizadas...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className={styles.waveMixPage__error}>
              <p>{error}</p>
              <Button variant="secondary" onClick={handleRefresh}>
                Intentar de nuevo
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && playlists.length === 0 && (
            <div className={styles.waveMixPage__emptyState}>
              <Waves size={64} />
              <h2>Aún no hay playlists</h2>
              <p>
                Empieza a escuchar música para que podamos generar
                playlists personalizadas para ti
              </p>
            </div>
          )}

          {/* Playlists Grid */}
          {!isLoading && !error && playlists.length > 0 && (
            <div className={styles.waveMixPage__grid}>
              {playlists.map((playlist) => (
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
                    size="medium"
                  />
                  <div className={styles.playlistCard__info}>
                    <h3 className={styles.playlistCard__name}>{playlist.name}</h3>
                    <p className={styles.playlistCard__description}>
                      {playlist.description}
                    </p>
                    <div className={styles.playlistCard__meta}>
                      <span>{playlist.metadata.totalTracks} canciones</span>
                      {playlist.type === 'wave-mix' && (
                        <>
                          <span className={styles.separator}>•</span>
                          <span>Actualizado hoy</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
