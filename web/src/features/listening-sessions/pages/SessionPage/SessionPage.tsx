import { useState, useCallback, useEffect, useContext } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  Copy, Check, Crown, Music, SkipForward, X,
  LogOut, Power, Radio, Plus, UserPlus, Search,
} from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useDocumentTitle } from '@shared/hooks';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { formatDuration } from '@shared/utils/format';
import { useAuthStore } from '@shared/store';
import { PlayerContext } from '@features/player/context/PlayerContext';
import { getFriends } from '@features/social/services/social.service';
import { useSessionStore } from '../../store/sessionStore';
import {
  useSessionDetails,
  useSkipTrack,
  useLeaveSession,
  useEndSession,
} from '../../hooks';
import { listeningSessionsService } from '../../services/listening-sessions.service';
import type { SessionQueueItem } from '../../types';
import styles from './SessionPage.module.css';

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const activeSession = useSessionStore((s) => s.activeSession);
  const myRole = useSessionStore((s) => s.myRole);
  const userId = useAuthStore((s) => s.user?.id);
  const avatarTimestamp = useAuthStore((s) => s.avatarTimestamp);
  const playerCtx = useContext(PlayerContext);

  const { data: sessionData } = useSessionDetails(activeSession?.id ?? id ?? null);
  const session = sessionData ?? activeSession;

  useDocumentTitle(session?.name ? `${session.name} · Sesion` : 'Sesion');

  const [copied, setCopied] = useState(false);
  const [trackSearch, setTrackSearch] = useState('');
  const [trackResults, setTrackResults] = useState<{ id: string; title: string; artistName?: string; albumId?: string }[]>([]);
  const [searchingTracks, setSearchingTracks] = useState(false);
  const [addedTrackId, setAddedTrackId] = useState<string | null>(null);
  const [availableFriends, setAvailableFriends] = useState<{ id: string; username: string; name: string | null; avatarUrl: string | null }[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState<{ id: string; title: string; artistName?: string; albumId?: string }[]>([]);

  const skipMutation = useSkipTrack();
  const leaveMutation = useLeaveSession();
  const endMutation = useEndSession();

  const isHost = myRole === 'host';
  const [guestsCanControl, setGuestsCanControl] = useState(true);

  // Sincronizar toggle con datos del servidor
  useEffect(() => {
    if (session?.guestsCanControl !== undefined) {
      setGuestsCanControl(session.guestsCanControl);
    }
  }, [session?.guestsCanControl]);

  const canAddToQueue = isHost || guestsCanControl;

  // Cargar amigos
  useEffect(() => {
    if (!isHost) return;
    const participantIds = new Set(session?.participants?.map((p) => p.userId) ?? []);
    getFriends()
      .then((friends) => setAvailableFriends(friends.filter((f) => !participantIds.has(f.id)).map((f) => ({ id: f.id, username: f.username, name: f.name, avatarUrl: f.avatarUrl }))))
      .catch(() => setAvailableFriends([]));
  }, [isHost, session?.participants]);

  // Cargar recomendaciones
  useEffect(() => {
    if (!session?.id || recommendations.length > 0) return;
    listeningSessionsService.getSessionRecommendations(session.id)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // Buscar canciones
  useEffect(() => {
    if (!trackSearch.trim()) { setTrackResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingTracks(true);
      try {
        const { apiClient } = await import('@shared/services/api');
        const { data } = await apiClient.get(`/tracks/search/${encodeURIComponent(trackSearch)}`, { params: { limit: 8 } });
        setTrackResults(((data as { data?: unknown[] }).data ?? []) as typeof trackResults);
      } catch { setTrackResults([]); }
      finally { setSearchingTracks(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [trackSearch]);

  const handleCopyCode = useCallback(async () => {
    if (!session?.inviteCode) return;
    await navigator.clipboard.writeText(session.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [session?.inviteCode]);

  const handleAddTrack = useCallback(async (trackId: string) => {
    if (!session?.id) return;
    try {
      await listeningSessionsService.addToQueue(session.id, { trackId });
      const trackData = [...trackResults, ...recommendations].find((t) => t.id === trackId);
      if (trackData && playerCtx) {
        playerCtx.addToQueue({ ...trackData, duration: 0 } as never);
      }
      setAddedTrackId(trackId);
      setTimeout(() => setAddedTrackId(null), 2000);
      setTrackSearch('');
      setTrackResults([]);
    } catch { /* silencioso */ }
  }, [session?.id, trackResults, recommendations, playerCtx]);

  const handleInviteFriend = useCallback(async (friendId: string) => {
    if (!session?.id) return;
    try {
      await listeningSessionsService.inviteFriend(session.id, friendId);
      setInvitedIds((prev) => new Set(prev).add(friendId));
    } catch { /* silencioso */ }
  }, [session?.id]);

  const handleSkip = useCallback(() => { if (session?.id) skipMutation.mutate(session.id); }, [session?.id, skipMutation]);
  const handleLeave = useCallback(() => { if (session?.id) { leaveMutation.mutate(session.id); setLocation('/social'); } }, [session?.id, leaveMutation, setLocation]);
  const handleEnd = useCallback(() => { if (session?.id) { endMutation.mutate(session.id); setLocation('/social'); } }, [session?.id, endMutation, setLocation]);

  if (!session) {
    return (
      <div className={styles.page}>
        <Sidebar />
        <main className={styles.main}>
          <Header showBackButton customSearch={<></>} />
          <div className={styles.content}>
            <div className={styles.empty}>Sesion no encontrada</div>
          </div>
        </main>
      </div>
    );
  }

  const participants = session.participants ?? [];
  const queue = session.queue ?? [];
  const currentTrack = queue.find((q) => q.trackId === session.currentTrackId && !q.played);
  const pendingTracks = queue.filter((q) => !q.played && q.trackId !== session.currentTrackId);

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.main}>
        <Header showBackButton customSearch={<></>} />
        <div className={styles.content}>
          {/* Hero */}
          <div className={styles.hero}>
            <div className={styles.heroGlow} />
            <div className={styles.heroContent}>
              <span className={styles.heroLabel}>
                <span className={styles.heroDot} />
                Sesion en grupo
              </span>
              <h1 className={styles.heroTitle}>{session.name}</h1>
              <div className={styles.heroMeta}>
                <span>{participants.length} participante{participants.length !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{queue.length} en cola</span>
              </div>
              <div className={styles.heroActions}>
                <button className={styles.codeBtn} onClick={handleCopyCode} type="button">
                  <span className={styles.codeValue}>{session.inviteCode}</span>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                {isHost ? (
                  <button className={styles.endBtn} onClick={handleEnd} disabled={endMutation.isPending} type="button">
                    <Power size={14} /> Terminar
                  </button>
                ) : (
                  <button className={styles.leaveBtn} onClick={handleLeave} disabled={leaveMutation.isPending} type="button">
                    <LogOut size={14} /> Salir
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Participantes */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Participantes</h2>
              {isHost && (
                <label className={styles.toggleLabel}>
                  <span>Permitir que otros controlen</span>
                  <input
                    type="checkbox"
                    className={styles.toggle}
                    checked={guestsCanControl}
                    onChange={async (e) => {
                      const newValue = e.target.checked;
                      setGuestsCanControl(newValue);
                      await listeningSessionsService.updateSettings(session.id, { guestsCanControl: newValue }).catch(() => {});
                    }}
                  />
                </label>
              )}
            </div>
            <div className={styles.participantsGrid}>
              {participants.map((p) => (
                <div key={p.id} className={styles.participant}>
                  <img src={getUserAvatarUrl(p.userId, p.hasAvatar, avatarTimestamp)} alt={p.username} className={styles.participantAvatar} onError={handleAvatarError} />
                  <span className={styles.participantName}>{p.name || p.username}</span>
                  {p.role === 'host' && (
                    <span className={styles.hostBadge}><Crown size={10} /> Host</span>
                  )}
                </div>
              ))}
              {/* Invitar amigos */}
              {isHost && availableFriends.slice(0, 4).map((f) => (
                <div key={f.id} className={`${styles.participant} ${styles['participant--invite']}`}>
                  <img src={getUserAvatarUrl(f.id, !!f.avatarUrl, avatarTimestamp)} alt={f.username} className={styles.participantAvatar} onError={handleAvatarError} />
                  <span className={styles.participantName}>{f.name || f.username}</span>
                  <button
                    className={`${styles.inviteBtn} ${invitedIds.has(f.id) ? styles['inviteBtn--done'] : ''}`}
                    onClick={() => handleInviteFriend(f.id)}
                    disabled={invitedIds.has(f.id)}
                    type="button"
                  >
                    {invitedIds.has(f.id) ? <><Check size={12} /> Enviado</> : <><UserPlus size={12} /> Invitar</>}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Now Playing */}
          {currentTrack && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Music size={18} /> Reproduciendo
              </h2>
              <div className={styles.nowPlaying}>
                <img src={getCoverUrl(currentTrack.albumId ? `/api/albums/${currentTrack.albumId}/cover` : undefined)} alt="" className={styles.nowPlayingCover} onError={(e) => { (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp'; }} />
                <div className={styles.nowPlayingInfo}>
                  <span className={styles.nowPlayingTitle}>{currentTrack.trackTitle}</span>
                  <span className={styles.nowPlayingArtist}>{currentTrack.artistName}</span>
                  <span className={styles.nowPlayingMeta}>{currentTrack.addedByUsername} · {formatDuration(currentTrack.trackDuration)}</span>
                </div>
                {isHost && (
                  <button className={styles.skipBtn} onClick={handleSkip} disabled={skipMutation.isPending} type="button">
                    <SkipForward size={20} />
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Sugerencias + buscador integrado */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <Music size={18} /> {trackSearch.trim() ? 'Resultados' : 'Sugerencias del grupo'}
              </h2>
            </div>
            {canAddToQueue && (
              <div className={styles.searchWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar y anadir canciones..."
                  value={trackSearch}
                  onChange={(e) => setTrackSearch(e.target.value)}
                />
                {trackSearch && (
                  <button className={styles.searchClear} onClick={() => { setTrackSearch(''); setTrackResults([]); }} type="button">
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            {searchingTracks && <p className={styles.searchHint}>Buscando...</p>}
            {trackResults.length > 0 ? (
              <div className={styles.trackGrid}>
                {trackResults.map((t) => (
                  <TrackCard key={t.id} track={t} onAdd={canAddToQueue ? handleAddTrack : () => {}} added={addedTrackId === t.id} />
                ))}
              </div>
            ) : (
              <SuggestionsSection recommendations={recommendations} queue={queue} trackSearch={trackSearch} onAdd={canAddToQueue ? handleAddTrack : () => {}} addedTrackId={addedTrackId} />
            )}
          </section>

          {/* Cola */}
          {pendingTracks.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>En cola · {pendingTracks.length}</h2>
              <div className={styles.queueList}>
                {pendingTracks.map((item, i) => (
                  <div key={item.id} className={styles.queueItem}>
                    <span className={styles.queueIndex}>{i + 1}</span>
                    <img src={getCoverUrl(item.albumId ? `/api/albums/${item.albumId}/cover` : undefined)} alt="" className={styles.queueCover} onError={(e) => { (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp'; }} />
                    <div className={styles.queueInfo}>
                      <span className={styles.queueTitle}>{item.trackTitle}</span>
                      <span className={styles.queueMeta}>{item.artistName} · {item.addedByUsername}</span>
                    </div>
                    <span className={styles.queueDuration}>{formatDuration(item.trackDuration)}</span>
                    {isHost && (
                      <button className={styles.removeBtn} onClick={async () => { await listeningSessionsService.removeFromQueue(session.id, item.id).catch(() => {}); }} type="button">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {queue.length === 0 && !canAddToQueue && (
            <div className={styles.emptyQueue}>
              <Radio size={32} />
              <p>La cola esta vacia</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TrackCard({ track, onAdd, added }: { track: { id: string; title: string; artistName?: string; albumId?: string }; onAdd: (id: string) => void; added: boolean }) {
  return (
    <div className={styles.trackCard}>
      <img src={getCoverUrl(track.albumId ? `/api/albums/${track.albumId}/cover` : undefined)} alt="" className={styles.trackCardCover} onError={(e) => { (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp'; }} />
      <div className={styles.trackCardInfo}>
        <span className={styles.trackCardTitle}>{track.title}</span>
        <span className={styles.trackCardArtist}>{track.artistName}</span>
      </div>
      <button className={`${styles.trackCardAdd} ${added ? styles['trackCardAdd--done'] : ''}`} onClick={() => onAdd(track.id)} disabled={added} type="button">
        {added ? <Check size={16} /> : <Plus size={16} />}
      </button>
    </div>
  );
}

function SuggestionsSection({ recommendations, queue, trackSearch, onAdd, addedTrackId }: {
  recommendations: { id: string; title: string; artistName?: string; albumId?: string }[];
  queue: SessionQueueItem[];
  trackSearch: string;
  onAdd: (id: string) => void;
  addedTrackId: string | null;
}) {
  const queueTrackIds = new Set(queue.map((q) => q.trackId));
  const filtered = recommendations.filter((t) => !queueTrackIds.has(t.id));

  if (filtered.length === 0 || trackSearch.trim()) return null;

  return (
    <div className={styles.trackGrid}>
      {filtered.slice(0, 8).map((t) => (
        <TrackCard key={t.id} track={t} onAdd={onAdd} added={addedTrackId === t.id} />
      ))}
    </div>
  );
}
