import { useState, useCallback } from 'react';
import { X, Search, Plus, Trash2, Music, Disc3, Zap } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { useCreateDjSession } from '@features/dj/hooks/useDjSessions';
import { djService } from '@features/dj/services/dj.service';
import { tracksService } from '@features/home/services/tracks.service';
import { logger } from '@shared/utils/logger';
import styles from './CreateDjSessionModal.module.css';

interface TrackSearchResult {
  id: string;
  title: string;
  artist: string;
  albumId?: string;
  albumName?: string;
  duration?: number;
}

interface SelectedTrack extends TrackSearchResult {
  bpm?: number;
  camelotKey?: string;
  energy?: number;
  compatibilityScore?: number;
}

interface DjSuggestion {
  trackId: string;
  title: string;
  artist: string;
  albumId?: string | null;
  bpm?: number | null;
  camelotKey?: string | null;
  energy?: number | null;
  compatibility: {
    overall: number;
    bpmScore: number;
    keyScore: number;
    energyScore: number;
  };
}

interface CreateDjSessionModalProps {
  onClose: () => void;
}

export function CreateDjSessionModal({ onClose }: CreateDjSessionModalProps) {
  const [sessionName, setSessionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrackSearchResult[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<SelectedTrack[]>([]);
  const [suggestions, setSuggestions] = useState<DjSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const createSessionMutation = useCreateDjSession();

  // Search for tracks
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const tracks = await tracksService.search(searchQuery, { take: 10 });
      const results: TrackSearchResult[] = tracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artistName || 'Unknown',
        albumId: track.albumId,
        albumName: track.albumName,
        duration: track.duration,
      }));
      setSearchResults(results);
    } catch (error) {
      logger.error('[CreateDjSession] Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Add track to selection
  const handleAddTrack = useCallback(async (track: TrackSearchResult) => {
    // Don't add duplicates
    if (selectedTracks.some(t => t.id === track.id)) return;

    // Get DJ analysis for this track
    let djData: Partial<SelectedTrack> = {};
    try {
      const analysis = await djService.getAnalysis(track.id);
      if (analysis) {
        djData = {
          bpm: analysis.bpm ?? undefined,
          camelotKey: analysis.camelotKey ?? undefined,
          energy: analysis.energy ?? undefined,
        };
      }
    } catch {
      // Track may not have DJ analysis yet
    }

    // Calculate compatibility with last track
    let compatibilityScore: number | undefined;
    if (selectedTracks.length > 0) {
      const lastTrack = selectedTracks[selectedTracks.length - 1];
      if (lastTrack.bpm && djData.bpm) {
        // Simple compatibility calculation
        const bpmDiff = Math.abs(lastTrack.bpm - djData.bpm) / lastTrack.bpm;
        compatibilityScore = Math.max(0, 100 - bpmDiff * 100);
      }
    }

    const newTrack: SelectedTrack = {
      ...track,
      ...djData,
      compatibilityScore,
    };

    setSelectedTracks(prev => [...prev, newTrack]);
    setSearchQuery('');
    setSearchResults([]);

    // Load suggestions for the new track
    loadSuggestions(track.id);
  }, [selectedTracks]);

  // Load DJ suggestions based on last track
  const loadSuggestions = useCallback(async (trackId: string) => {
    setIsLoadingSuggestions(true);
    try {
      const result = await djService.getSuggestions(trackId, {
        limit: 5,
        minScore: 60,
      });

      // Filter out already selected tracks
      const selectedIds = new Set(selectedTracks.map(t => t.id));
      const filtered = result.suggestions.filter(s => !selectedIds.has(s.trackId));
      setSuggestions(filtered);
    } catch (error) {
      logger.error('[CreateDjSession] Suggestions error:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [selectedTracks]);

  // Add suggestion to selection
  const handleAddSuggestion = useCallback((suggestion: DjSuggestion) => {
    const newTrack: SelectedTrack = {
      id: suggestion.trackId,
      title: suggestion.title,
      artist: suggestion.artist,
      albumId: suggestion.albumId ?? undefined,
      bpm: suggestion.bpm ?? undefined,
      camelotKey: suggestion.camelotKey ?? undefined,
      energy: suggestion.energy ?? undefined,
      compatibilityScore: suggestion.compatibility.overall,
    };

    setSelectedTracks(prev => [...prev, newTrack]);

    // Load new suggestions based on this track
    loadSuggestions(suggestion.trackId);
  }, [loadSuggestions]);

  // Remove track from selection
  const handleRemoveTrack = useCallback((trackId: string) => {
    setSelectedTracks(prev => prev.filter(t => t.id !== trackId));
  }, []);

  // Create the session
  const handleCreate = async () => {
    if (!sessionName.trim() || selectedTracks.length === 0) return;

    try {
      await createSessionMutation.mutateAsync({
        name: sessionName.trim(),
        trackIds: selectedTracks.map(t => t.id),
      });
      onClose();
    } catch (error) {
      logger.error('[CreateDjSession] Create error:', error);
      alert('Error al crear la sesión DJ');
    }
  };

  // Get compatibility color
  const getCompatibilityColor = (score?: number) => {
    if (!score) return 'var(--text-tertiary)';
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className={styles.modal}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.content}>
        <div className={styles.header}>
          <h2>
            <Disc3 size={24} />
            Nueva Sesión DJ
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Session Name */}
          <div className={styles.field}>
            <label>Nombre de la sesión</label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Mi sesión DJ..."
              className={styles.input}
            />
          </div>

          {/* Search Tracks */}
          <div className={styles.field}>
            <label>Añadir tracks</label>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por nombre o artista..."
                className={styles.searchInput}
              />
              <Button
                variant="secondary"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? '...' : 'Buscar'}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    className={styles.searchResult}
                    onClick={() => handleAddTrack(track)}
                  >
                    <div className={styles.trackCover}>
                      {track.albumId ? (
                        <img
                          src={`/api/images/albums/${track.albumId}/cover`}
                          alt=""
                        />
                      ) : (
                        <Music size={20} />
                      )}
                    </div>
                    <div className={styles.trackInfo}>
                      <span className={styles.trackTitle}>{track.title}</span>
                      <span className={styles.trackArtist}>{track.artist}</span>
                    </div>
                    <Plus size={18} className={styles.addIcon} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Tracks */}
          <div className={styles.field}>
            <label>
              Tracks seleccionados ({selectedTracks.length})
            </label>
            {selectedTracks.length === 0 ? (
              <div className={styles.emptyTracks}>
                <Music size={32} />
                <p>Busca y añade tracks para crear tu sesión</p>
              </div>
            ) : (
              <div className={styles.selectedTracks}>
                {selectedTracks.map((track, index) => (
                  <div key={track.id} className={styles.selectedTrack}>
                    <span className={styles.trackNumber}>{index + 1}</span>
                    <div className={styles.trackCover}>
                      {track.albumId ? (
                        <img
                          src={`/api/images/albums/${track.albumId}/cover`}
                          alt=""
                        />
                      ) : (
                        <Music size={16} />
                      )}
                    </div>
                    <div className={styles.trackInfo}>
                      <span className={styles.trackTitle}>{track.title}</span>
                      <span className={styles.trackArtist}>{track.artist}</span>
                    </div>
                    <div className={styles.trackDjInfo}>
                      {track.bpm && (
                        <span className={styles.djTag} data-type="bpm">
                          {Math.round(track.bpm)} BPM
                        </span>
                      )}
                      {track.camelotKey && (
                        <span className={styles.djTag} data-type="key">
                          {track.camelotKey}
                        </span>
                      )}
                      {index > 0 && track.compatibilityScore && (
                        <span
                          className={styles.djTag}
                          data-type="score"
                          style={{ color: getCompatibilityColor(track.compatibilityScore) }}
                        >
                          {Math.round(track.compatibilityScore)}%
                        </span>
                      )}
                    </div>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemoveTrack(track.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DJ Suggestions */}
          {selectedTracks.length > 0 && (
            <div className={styles.field}>
              <label>
                <Zap size={16} />
                Sugerencias compatibles
              </label>
              {isLoadingSuggestions ? (
                <div className={styles.loadingSuggestions}>
                  Buscando tracks compatibles...
                </div>
              ) : suggestions.length === 0 ? (
                <div className={styles.noSuggestions}>
                  No hay sugerencias disponibles
                </div>
              ) : (
                <div className={styles.suggestions}>
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.trackId}
                      className={styles.suggestion}
                      onClick={() => handleAddSuggestion(suggestion)}
                    >
                      <div className={styles.suggestionInfo}>
                        <span className={styles.trackTitle}>{suggestion.title}</span>
                        <span className={styles.trackArtist}>{suggestion.artist}</span>
                      </div>
                      <div className={styles.suggestionScore}>
                        <span
                          className={styles.scoreValue}
                          style={{ color: getCompatibilityColor(suggestion.compatibility.overall) }}
                        >
                          {suggestion.compatibility.overall}%
                        </span>
                        <span className={styles.scoreLabel}>compatible</span>
                      </div>
                      <Plus size={18} className={styles.addIcon} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!sessionName.trim() || selectedTracks.length === 0 || createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? 'Creando...' : 'Crear Sesión'}
          </Button>
        </div>
      </div>
    </div>
  );
}
