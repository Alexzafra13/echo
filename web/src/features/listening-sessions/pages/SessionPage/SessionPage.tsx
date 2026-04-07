import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'wouter';
import { Radio, Search, X } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@shared/components/layout/Sidebar';
import { useDocumentTitle, useDominantColor } from '@shared/hooks';
import { useAuthStore } from '@shared/store';
import { usePlayback } from '@features/player';
import { useSessionStore } from '../../store/sessionStore';
import { useSessionDetails, useSkipTrack, useLeaveSession, useEndSession } from '../../hooks';
import {
  useTrackSearch,
  useSessionFriends,
  useSessionRecommendations,
  useSessionQueueSync,
  useAddTrackToSession,
} from '../../hooks/useSessionPageData';
import { listeningSessionsService } from '../../services/listening-sessions.service';
import { SessionHero } from './components/SessionHero';
import { SessionParticipants } from './components/SessionParticipants';
import { SessionNowPlaying } from './components/SessionNowPlaying';
import { SessionDevice } from './components/SessionDevice';
import { TrackCard } from './components/TrackCard';
import { SuggestionsSection } from './components/SuggestionsSection';
import styles from './SessionPage.module.css';

export default function SessionPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const activeSession = useSessionStore((s) => s.activeSession);
  const myRole = useSessionStore((s) => s.myRole);
  const avatarTimestamp = useAuthStore((s) => s.avatarTimestamp);
  const { currentTrack: playerTrack } = usePlayback();

  const { data: sessionData } = useSessionDetails(activeSession?.id ?? id ?? null);
  const session = sessionData ?? activeSession;

  useDocumentTitle(session?.name ? `${session.name} · Sesion` : 'Sesion');

  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const skipMutation = useSkipTrack();
  const leaveMutation = useLeaveSession();
  const endMutation = useEndSession();

  const isHost = myRole === 'host';
  const [guestsCanControl, setGuestsCanControl] = useState<boolean | null>(null);

  useEffect(() => {
    if (session?.guestsCanControl !== undefined) {
      setGuestsCanControl(session.guestsCanControl);
    }
  }, [session?.guestsCanControl]);

  const effectiveGuestsCanControl = guestsCanControl ?? true;
  const sessionMode = session?.mode || 'sync';
  const isJukebox = sessionMode === 'jukebox';
  const canAddToQueue = isHost || effectiveGuestsCanControl;
  const shouldSyncPlayback = !isJukebox || isHost;

  const availableFriends = useSessionFriends(isHost, session?.participants);
  const recommendations = useSessionRecommendations(session?.id);
  const trackSearch = useTrackSearch();
  useSessionQueueSync(session ?? undefined, shouldSyncPlayback);
  const { addTrack, addedTrackId } = useAddTrackToSession(session?.id, shouldSyncPlayback);

  const handleCopyCode = useCallback(async () => {
    if (!session?.inviteCode) return;
    await navigator.clipboard.writeText(session.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [session?.inviteCode]);

  const handleAddTrack = useCallback(
    async (trackId: string) => {
      await addTrack(trackId);
      trackSearch.clear();
    },
    [addTrack, trackSearch]
  );

  const handleInviteFriend = useCallback(
    async (friendId: string) => {
      if (!session?.id) return;
      try {
        await listeningSessionsService.inviteFriend(session.id, friendId);
        setInvitedIds((prev) => new Set(prev).add(friendId));
      } catch {
        /* silencioso */
      }
    },
    [session?.id]
  );

  const handleSkip = useCallback(() => {
    if (session?.id) skipMutation.mutate(session.id);
  }, [session?.id, skipMutation]);

  const handleLeave = useCallback(() => {
    if (session?.id) {
      leaveMutation.mutate(session.id);
      setLocation('/social');
    }
  }, [session?.id, leaveMutation, setLocation]);

  const handleEnd = useCallback(() => {
    if (session?.id) {
      endMutation.mutate(session.id);
      setLocation('/social');
    }
  }, [session?.id, endMutation, setLocation]);

  const participants = session?.participants ?? [];
  const queue = session?.queue ?? [];
  const currentTrack = queue.find((q) => q.trackId === session?.currentTrackId && !q.played);
  const pendingTracks = queue.filter((q) => !q.played && q.trackId !== session?.currentTrackId);

  const playerAlbumId = playerTrack?.albumId || playerTrack?.album?.id;
  const sessionAlbumId = currentTrack?.albumId ?? queue[0]?.albumId;
  const heroAlbumId = playerAlbumId || sessionAlbumId;
  const heroCoverUrl = heroAlbumId ? `/api/images/albums/${heroAlbumId}/cover` : undefined;
  const heroTrackName = playerTrack?.title || currentTrack?.trackTitle || queue[0]?.trackTitle;
  const hostParticipant = participants.find((p) => p.role === 'host');
  const hostDisplayName = hostParticipant?.name || hostParticipant?.username || 'host';
  const dominantColor = useDominantColor(heroCoverUrl);

  if (!session) {
    return (
      <div className={styles.page}>
        <Sidebar />
        <main className={styles.main}>
          <Header showBackButton customSearch={<></>} alwaysGlass />
          <div className={styles.content}>
            <div className={styles.empty}>{t('sessions.notFound')}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className={styles.page}
      style={{ '--session-color': dominantColor } as React.CSSProperties}
    >
      <Sidebar />
      <main className={styles.main}>
        <Header showBackButton customSearch={<></>} alwaysGlass />
        <div className={styles.content}>
          <SessionHero
            session={session}
            isHost={isHost}
            participantCount={participants.length}
            queueLength={queue.length}
            heroTrackName={heroTrackName}
            heroCoverUrl={heroCoverUrl}
            copied={copied}
            onCopyCode={handleCopyCode}
            onEnd={handleEnd}
            onLeave={handleLeave}
            isEndPending={endMutation.isPending}
            isLeavePending={leaveMutation.isPending}
            effectiveGuestsCanControl={effectiveGuestsCanControl}
            onGuestsCanControlChange={setGuestsCanControl}
          />

          <SessionParticipants
            participants={participants}
            isHost={isHost}
            availableFriends={availableFriends}
            invitedIds={invitedIds}
            avatarTimestamp={avatarTimestamp}
            onInviteFriend={handleInviteFriend}
          />

          {currentTrack && (
            <SessionNowPlaying
              currentTrack={currentTrack}
              isHost={isHost}
              onSkip={handleSkip}
              isSkipPending={skipMutation.isPending}
            />
          )}

          <div className={styles.columns}>
            <div className={styles.columnDevice}>
              <SessionDevice
                sessionId={session.id}
                isJukebox={isJukebox}
                isHost={isHost}
                currentTrack={currentTrack}
                pendingTracks={pendingTracks}
                hostDisplayName={hostDisplayName}
              />
            </div>

            <div className={styles.columnSearch}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  {trackSearch.query.trim() ? t('sessions.results') : t('sessions.suggestions')}
                </h2>
                {canAddToQueue && (
                  <div
                    className={`${styles.expandingSearch} ${searchOpen ? styles['expandingSearch--open'] : ''}`}
                  >
                    <button
                      className={styles.expandingSearchBtn}
                      onClick={() => {
                        if (!searchOpen) {
                          setSearchOpen(true);
                          setTimeout(() => searchInputRef.current?.focus(), 300);
                        } else if (!trackSearch.query) {
                          setSearchOpen(false);
                        }
                      }}
                      type="button"
                      aria-label={t('sessions.searchSongs')}
                    >
                      <Search size={16} />
                    </button>
                    <input
                      ref={searchInputRef}
                      type="text"
                      className={styles.expandingSearchInput}
                      placeholder={t('sessions.searchSongsPlaceholder')}
                      value={trackSearch.query}
                      onChange={(e) => trackSearch.setQuery(e.target.value)}
                      onBlur={() => {
                        if (!trackSearch.query) setSearchOpen(false);
                      }}
                    />
                    {trackSearch.query && (
                      <button
                        className={styles.expandingSearchClear}
                        onClick={() => {
                          trackSearch.clear();
                          searchInputRef.current?.focus();
                        }}
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {trackSearch.searching && (
                <p className={styles.searchHint}>{t('sessions.searching')}</p>
              )}
              {trackSearch.results.length > 0 ? (
                <div className={styles.trackGrid}>
                  {trackSearch.results.map(
                    (t: { id: string; title: string; artistName?: string; albumId?: string }) => (
                      <TrackCard
                        key={t.id}
                        track={t}
                        onAdd={canAddToQueue ? handleAddTrack : () => {}}
                        added={addedTrackId === t.id}
                      />
                    )
                  )}
                </div>
              ) : (
                <SuggestionsSection
                  recommendations={recommendations}
                  queue={queue}
                  searchQuery={trackSearch.query}
                  onAdd={canAddToQueue ? handleAddTrack : () => {}}
                  addedTrackId={addedTrackId}
                />
              )}
            </div>
          </div>

          {queue.length === 0 && !canAddToQueue && (
            <div className={styles.emptyQueue}>
              <Radio size={32} />
              <p>{t('sessions.emptyQueueMessage')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
