import { useState, useEffect } from 'react';
import { Search, Music, X, Plus, Check, Loader2 } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { useTrackSearch } from '@features/home/hooks/useTracks';
import { getRecentlyPlayed, type RecentlyPlayed } from '@shared/services/play-tracking.service';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { logger } from '@shared/utils/logger';
import type { Track } from '@shared/types';
import styles from './CreatePlaylistModal.module.css';

interface SelectedTrack {
  id: string;
  title: string;
  artistName?: string;
  albumId?: string;
}

interface CreatePlaylistModalProps {
  onClose: () => void;
  onSubmit: (name: string, trackIds: string[], options?: { processStems?: boolean }) => Promise<void>;
  isLoading?: boolean;
  /** If true, changes the modal title and placeholder text for DJ sessions */
  isDjSession?: boolean;
}

/**
 * CreatePlaylistModal Component
 * Modal for creating a new playlist with at least one song
 */
export function CreatePlaylistModal({ onClose, onSubmit, isLoading = false, isDjSession = false }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<SelectedTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<RecentlyPlayed[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [error, setError] = useState('');
  const [processStems, setProcessStems] = useState(false);

  // Search tracks
  const { data: searchResults, isLoading: searchLoading } = useTrackSearch(searchQuery, { take: 8 });

  // Load recently played on mount
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const recent = await getRecentlyPlayed(10);
        setRecentTracks(recent);
      } catch (err) {
        if (import.meta.env.DEV) {
          logger.error('Failed to load recent tracks:', err);
        }
      } finally {
        setLoadingRecent(false);
      }
    };
    loadRecent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(isDjSession ? 'El nombre de la sesión es obligatorio' : 'El nombre de la playlist es obligatorio');
      return;
    }

    if (selectedTracks.length === 0) {
      setError('Añade al menos una canción');
      return;
    }

    try {
      const options = isDjSession ? { processStems } : undefined;
      await onSubmit(name.trim(), selectedTracks.map(t => t.id), options);
      onClose();
    } catch (error) {
      setError(getApiErrorMessage(error, isDjSession ? 'Error al crear la sesión DJ' : 'Error al crear la playlist'));
    }
  };

  const toggleTrack = (track: Track | RecentlyPlayed) => {
    if (!track || typeof track !== 'object') return;

    const isRecentlyPlayed = 'trackId' in track;
    const trackData = isRecentlyPlayed && (track as RecentlyPlayed).track
      ? (track as RecentlyPlayed).track!
      : track as Track;
    const trackId = isRecentlyPlayed
      ? (track as RecentlyPlayed).trackId
      : (track as Track).id;

    const isSelected = selectedTracks.some(t => t.id === trackId);

    if (isSelected) {
      setSelectedTracks(prev => prev.filter(t => t.id !== trackId));
    } else {
      setSelectedTracks(prev => [...prev, {
        id: trackId,
        title: trackData.title,
        artistName: trackData.artistName,
        albumId: 'albumId' in trackData ? (trackData.albumId as string | undefined) : undefined,
      }]);
    }
    setError('');
  };

  const isTrackSelected = (trackId: string) => selectedTracks.some(t => t.id === trackId);

  const canCreate = name.trim().length > 0 && selectedTracks.length > 0;

  // Filter out already selected from recent
  const filteredRecent = recentTracks.filter(r => !isTrackSelected(r.trackId));

  return (
    <Modal isOpen={true} onClose={onClose} title={isDjSession ? 'Nueva Sesión DJ' : 'Nueva Playlist'}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Name field */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>{isDjSession ? 'Nombre de la sesión' : 'Nombre de la playlist'}</label>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder={isDjSession ? 'Mi Sesión DJ...' : 'Mi Playlist...'}
            autoFocus
            disabled={isLoading}
          />
        </div>

        {/* Stem processing option (DJ sessions only) - placed early for mobile visibility */}
        {isDjSession && (
          <div className={styles.stemOption}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={processStems}
                onChange={(e) => setProcessStems(e.target.checked)}
                className={styles.checkbox}
                disabled={isLoading}
              />
              <span className={styles.checkboxText}>
                Procesar stems (permite mashups)
              </span>
            </label>
            <span className={styles.stemHint}>
              La separación de stems puede tardar varios minutos por canción
            </span>
          </div>
        )}

        {/* Song search */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Buscar canciones</label>
          <div className={styles.searchInputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título o artista..."
              disabled={isLoading}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        {searchQuery.length >= 2 && (
          <div className={styles.trackSection}>
            <span className={styles.sectionLabel}>Resultados de búsqueda</span>
            <div className={styles.trackList}>
              {searchLoading ? (
                <div className={styles.loadingState}>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>Buscando...</span>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((track, index) => (
                  <TrackItem
                    key={`search-${track.id}-${index}`}
                    track={track}
                    isSelected={isTrackSelected(track.id)}
                    onToggle={() => toggleTrack(track)}
                  />
                ))
              ) : (
                <div className={styles.emptyState}>
                  <Music size={24} />
                  <span>No se encontraron canciones</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recently played suggestions (only show if not searching) */}
        {searchQuery.length < 2 && (
          <div className={styles.trackSection}>
            <span className={styles.sectionLabel}>Sugerencias (escuchadas recientemente)</span>
            <div className={styles.trackList}>
              {loadingRecent ? (
                <div className={styles.loadingState}>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>Cargando sugerencias...</span>
                </div>
              ) : filteredRecent.length > 0 ? (
                filteredRecent.slice(0, 6).map((recent, index) => (
                  <TrackItem
                    key={`recent-${recent.trackId}-${index}`}
                    track={recent}
                    isSelected={isTrackSelected(recent.trackId)}
                    onToggle={() => toggleTrack(recent)}
                  />
                ))
              ) : recentTracks.length === 0 ? (
                <div className={styles.emptyState}>
                  <Music size={24} />
                  <span>No hay canciones recientes</span>
                  <span className={styles.emptyHint}>Usa el buscador para añadir canciones</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Selected tracks */}
        {selectedTracks.length > 0 && (
          <div className={styles.selectedSection}>
            <span className={styles.sectionLabel}>
              Canciones seleccionadas ({selectedTracks.length})
            </span>
            <div className={styles.selectedList}>
              {selectedTracks.map(track => (
                <div key={track.id} className={styles.selectedItem}>
                  {track.albumId ? (
                    <>
                      <img
                        src={`/api/albums/${track.albumId}/cover`}
                        alt=""
                        className={styles.selectedCover}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty('display', 'flex');
                        }}
                      />
                      <div className={styles.selectedCoverPlaceholder} style={{ display: 'none' }}>
                        <Music size={12} />
                      </div>
                    </>
                  ) : (
                    <div className={styles.selectedCoverPlaceholder}>
                      <Music size={12} />
                    </div>
                  )}
                  <div className={styles.selectedInfo}>
                    <span className={styles.selectedTitle}>{track.title}</span>
                    {track.artistName && (
                      <span className={styles.selectedArtist}>{track.artistName}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => setSelectedTracks(prev => prev.filter(t => t.id !== track.id))}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !canCreate}
          >
            {isLoading ? 'Creando...' : `Crear ${isDjSession ? 'Sesión' : 'Playlist'}${selectedTracks.length > 0 ? ` (${selectedTracks.length})` : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Track item sub-component
interface TrackItemProps {
  track: Track | RecentlyPlayed;
  isSelected: boolean;
  onToggle: () => void;
}

function TrackItem({ track, isSelected, onToggle }: TrackItemProps) {
  // Guard against invalid data
  if (!track || typeof track !== 'object') {
    return null;
  }

  // Check if this is a RecentlyPlayed (has trackId) or Track (has id directly)
  const isRecentlyPlayed = 'trackId' in track;
  const trackData = isRecentlyPlayed && (track as RecentlyPlayed).track
    ? (track as RecentlyPlayed).track!
    : track as Track;
  const albumId = 'albumId' in trackData ? (trackData.albumId as string | undefined) : undefined;

  return (
    <button
      type="button"
      className={`${styles.trackItem} ${isSelected ? styles.trackItemSelected : ''}`}
      onClick={onToggle}
    >
      {albumId ? (
        <img
          src={`/api/albums/${albumId}/cover`}
          alt={trackData.title}
          className={styles.trackCover}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove(styles.hidden);
          }}
        />
      ) : null}
      <div className={`${styles.trackCoverPlaceholder} ${albumId ? styles.hidden : ''}`}>
        <Music size={16} />
      </div>
      <div className={styles.trackInfo}>
        <span className={styles.trackTitle}>{trackData.title}</span>
        {trackData.artistName && (
          <span className={styles.trackArtist}>{trackData.artistName}</span>
        )}
      </div>
      <div className={styles.trackAction}>
        {isSelected ? (
          <Check size={18} className={styles.checkIcon} />
        ) : (
          <Plus size={18} className={styles.plusIcon} />
        )}
      </div>
    </button>
  );
}
