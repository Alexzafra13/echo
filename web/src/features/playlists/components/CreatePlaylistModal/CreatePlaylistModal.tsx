import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Music, X, Plus, Check, Loader2 } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { useTrackSearch } from '@features/home';
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
  onSubmit: (name: string, trackIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

export function CreatePlaylistModal({
  onClose,
  onSubmit,
  isLoading = false,
}: CreatePlaylistModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<SelectedTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<RecentlyPlayed[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [error, setError] = useState('');

  const { data: searchResults, isLoading: searchLoading } = useTrackSearch(searchQuery, {
    take: 8,
  });

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
      setError(t('playlists.nameRequired'));
      return;
    }

    if (selectedTracks.length === 0) {
      setError(t('playlists.addSongsRequired'));
      return;
    }

    try {
      await onSubmit(
        name.trim(),
        selectedTracks.map((t) => t.id)
      );
      onClose();
    } catch (error) {
      setError(getApiErrorMessage(error, t('playlists.createError')));
    }
  };

  const toggleTrack = (track: Track | RecentlyPlayed) => {
    if (!track || typeof track !== 'object') return;

    const isRecentlyPlayed = 'trackId' in track;
    const trackData =
      isRecentlyPlayed && (track as RecentlyPlayed).track
        ? (track as RecentlyPlayed).track!
        : (track as Track);
    const trackId = isRecentlyPlayed ? (track as RecentlyPlayed).trackId : (track as Track).id;

    const isSelected = selectedTracks.some((t) => t.id === trackId);

    if (isSelected) {
      setSelectedTracks((prev) => prev.filter((t) => t.id !== trackId));
    } else {
      setSelectedTracks((prev) => [
        ...prev,
        {
          id: trackId,
          title: trackData.title,
          artistName: trackData.artistName,
          albumId: 'albumId' in trackData ? (trackData.albumId as string | undefined) : undefined,
        },
      ]);
    }
    setError('');
  };

  const isTrackSelected = (trackId: string) => selectedTracks.some((t) => t.id === trackId);

  const canCreate = name.trim().length > 0 && selectedTracks.length > 0;

  const filteredRecent = recentTracks.filter((r) => !isTrackSelected(r.trackId));

  return (
    <Modal isOpen={true} onClose={onClose} title={t('playlists.createTitle')}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>{t('playlists.nameLabel')}</label>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder={t('playlists.namePlaceholder')}
            autoFocus
            disabled={isLoading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>{t('playlists.searchSongs')}</label>
          <div className={styles.searchInputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('playlists.searchPlaceholder')}
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

        {searchQuery.length >= 2 && (
          <div className={styles.trackSection}>
            <span className={styles.sectionLabel}>{t('playlists.searchResults')}</span>
            <div className={styles.trackList}>
              {searchLoading ? (
                <div className={styles.loadingState}>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>{t('playlists.searching')}</span>
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
                  <span>{t('playlists.noSongsFound')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {searchQuery.length < 2 && (
          <div className={styles.trackSection}>
            <span className={styles.sectionLabel}>{t('playlists.suggestions')}</span>
            <div className={styles.trackList}>
              {loadingRecent ? (
                <div className={styles.loadingState}>
                  <Loader2 size={20} className={styles.spinner} />
                  <span>{t('playlists.loadingSuggestions')}</span>
                </div>
              ) : filteredRecent.length > 0 ? (
                filteredRecent
                  .slice(0, 6)
                  .map((recent, index) => (
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
                  <span>{t('playlists.noRecentSongs')}</span>
                  <span className={styles.emptyHint}>{t('playlists.useSearchHint')}</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {selectedTracks.length > 0 && (
          <div className={styles.selectedSection}>
            <span className={styles.sectionLabel}>
              {t('playlists.selectedSongs', { count: selectedTracks.length })}
            </span>
            <div className={styles.selectedList}>
              {selectedTracks.map((track) => (
                <div key={track.id} className={styles.selectedItem}>
                  {track.albumId ? (
                    <>
                      <img
                        src={`/api/albums/${track.albumId}/cover`}
                        alt=""
                        className={styles.selectedCover}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty(
                            'display',
                            'flex'
                          );
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
                    onClick={() =>
                      setSelectedTracks((prev) => prev.filter((t) => t.id !== track.id))
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !canCreate}>
            {isLoading
              ? t('common.creating')
              : selectedTracks.length > 0
                ? t('playlists.createButtonWithCount', { count: selectedTracks.length })
                : t('playlists.createButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface TrackItemProps {
  track: Track | RecentlyPlayed;
  isSelected: boolean;
  onToggle: () => void;
}

function TrackItem({ track, isSelected, onToggle }: TrackItemProps) {
  if (!track || typeof track !== 'object') {
    return null;
  }

  const isRecentlyPlayed = 'trackId' in track;
  const trackData =
    isRecentlyPlayed && (track as RecentlyPlayed).track
      ? (track as RecentlyPlayed).track!
      : (track as Track);
  const albumId = 'albumId' in trackData ? (trackData.albumId as string | undefined) : undefined;

  return (
    <button
      type="button"
      data-testid="track-item"
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
        {trackData.artistName && <span className={styles.trackArtist}>{trackData.artistName}</span>}
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
