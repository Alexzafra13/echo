import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Users, Search, X, UserPlus, CheckCircle, Headphones, Activity } from 'lucide-react';
import { useDocumentTitle } from '@shared/hooks';
import { useModal } from '@shared/hooks';
import { useDominantColor } from '@shared/hooks/useDominantColor';
import { Sidebar } from '@shared/components/layout/Sidebar';
import { Header } from '@shared/components/layout/Header';
import { Button, UserAvatar } from '@shared/components/ui';
import { getUserAvatarUrl, getAvatarColor } from '@shared/utils/avatar.utils';
import { useAuthStore } from '@shared/store';
import {
  useSocialOverview,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriendship,
  useSearchUsers,
} from '../../hooks';
import { useListeningNowSSE } from '../../hooks/useListeningNowSSE';
import { logger } from '@shared/utils/logger';
import {
  ListeningNowSection,
  PendingRequestsSection,
  FriendsSection,
  ActivityFeed,
} from './components';
import {
  CreateSessionModal,
  JoinSessionModal,
  SessionSection,
} from '@features/listening-sessions/components';
import styles from './SocialPage.module.css';

/**
 * SocialPage Component
 * Hub social principal: amigos, escuchando ahora, feed de actividad
 */
export default function SocialPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('social.pageTitle'));
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.user);

  // URL del avatar real (null si no tiene foto subida)
  const avatarUrl = useMemo(
    () =>
      currentUser?.hasAvatar
        ? getUserAvatarUrl(currentUser.id, true)
        : null,
    [currentUser]
  );

  // Color de fondo del hero: extraer del avatar real, o usar el color determinista del userId
  const avatarFallbackColor = useMemo(() => {
    if (!currentUser?.id) return undefined;
    const hex = getAvatarColor(currentUser.id);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }, [currentUser?.id]);

  const dominantColor = useDominantColor(avatarUrl, avatarFallbackColor);

  // Debounce del query de búsqueda para no disparar una request por cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: overview, isLoading } = useSocialOverview();
  const { data: searchResults, refetch: refetchSearch } = useSearchUsers(
    debouncedSearchQuery,
    debouncedSearchQuery.length >= 2
  );

  useListeningNowSSE();

  const sendRequestMutation = useSendFriendRequest();
  const acceptRequestMutation = useAcceptFriendRequest();
  const removeFriendshipMutation = useRemoveFriendship();

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSendRequest = async (userId: string, userName: string) => {
    try {
      await sendRequestMutation.mutateAsync(userId);
      setSuccessMessage(t('social.requestSent', { name: userName }));
      refetchSearch();
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error sending friend request:', error);
      }
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptRequestMutation.mutateAsync(friendshipId);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error accepting friend request:', error);
      }
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await removeFriendshipMutation.mutateAsync(friendshipId);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error rejecting friend request:', error);
      }
    }
  };

  // Modales de sesiones de escucha
  const createSessionModal = useModal();
  const joinSessionModal = useModal();

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  const handleUserClick = (userId: string) => setLocation(`/user/${userId}`);
  const handleTargetClick = (url: string) => setLocation(url);

  const actuallyListening = overview?.listeningNow?.filter((u) => u.isPlaying) || [];
  const friends = overview?.friends || [];
  const pendingReceived = overview?.pendingRequests?.received?.length || 0;
  const activities = overview?.recentActivity || [];

  // Componente de búsqueda para el Header
  const headerSearch = (
    <div className={styles.headerSearch}>
      <div className={styles.headerSearch__wrapper}>
        <Search size={18} className={styles.headerSearch__icon} />
        <input
          type="text"
          placeholder={t('social.searchUsersPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.headerSearch__input}
          autoComplete="off"
        />
        {searchQuery && (
          <button onClick={handleClearSearch} className={styles.headerSearch__clear}>
            <X size={16} />
          </button>
        )}
      </div>
      {debouncedSearchQuery.length >= 2 && (
        <div className={styles.headerSearch__results}>
          {searchResults && searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div key={user.id} className={styles.searchResult}>
                <UserAvatar
                  userId={user.id}
                  avatarUrl={user.avatarUrl}
                  username={user.username}
                  className={styles.searchResult__avatar}
                />
                <div className={styles.searchResult__info}>
                  <span className={styles.searchResult__name}>{user.name || user.username}</span>
                  <span className={styles.searchResult__username}>@{user.username}</span>
                </div>
                {user.friendshipStatus === 'accepted' ? (
                  <span className={styles.searchResult__status}>{t('social.friendStatus')}</span>
                ) : user.friendshipStatus === 'pending' ? (
                  <span className={styles.searchResult__statusPending}>
                    {t('social.pendingStatus')}
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSendRequest(user.id, user.name || user.username)}
                    disabled={sendRequestMutation.isPending}
                  >
                    <UserPlus size={16} />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className={styles.headerSearch__empty}>{t('social.noUsersFound')}</div>
          )}
          {successMessage && (
            <div className={styles.headerSearch__success}>
              <CheckCircle size={14} />
              {successMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.socialPage}>
      <Sidebar />

      <main className={styles.socialPage__main}>
        <Header customSearch={headerSearch} />

        <div className={styles.socialPage__content}>
          {/* Profile Hero */}
          <div
            className={styles.profileHero}
            style={{ '--hero-color': dominantColor } as React.CSSProperties}
          >
            <div className={styles.profileHero__glow} />
            <div className={styles.profileHero__fade} />
            <div className={styles.profileHero__inner}>
              <div
                onClick={() => currentUser && handleUserClick(currentUser.id)}
                style={{ cursor: 'pointer' }}
              >
                <UserAvatar
                  userId={currentUser?.id}
                  hasAvatar={currentUser?.hasAvatar}
                  username={currentUser?.username}
                  className={styles.profileHero__avatar}
                />
              </div>
              <div className={styles.profileHero__info}>
                <h1 className={styles.profileHero__name}>
                  {currentUser?.name || currentUser?.username}
                </h1>
                <span className={styles.profileHero__username}>@{currentUser?.username}</span>
                <div className={styles.profileHero__stats}>
                  <span className={styles.profileHero__stat}>
                    <Users size={14} />
                    <strong>{friends.length}</strong>{' '}
                    {t('social.friendCount', { count: friends.length })}
                  </span>
                  {actuallyListening.length > 0 && (
                    <span
                      className={`${styles.profileHero__stat} ${styles['profileHero__stat--live']}`}
                    >
                      <Headphones size={14} />
                      <strong>{actuallyListening.length}</strong> {t('social.listeningCount')}
                    </span>
                  )}
                  {pendingReceived > 0 && (
                    <span
                      className={`${styles.profileHero__stat} ${styles['profileHero__stat--pending']}`}
                    >
                      <UserPlus size={14} />
                      <strong>{pendingReceived}</strong>{' '}
                      {t('social.pendingCount', { count: pendingReceived })}
                    </span>
                  )}
                  <span className={styles.profileHero__stat}>
                    <Activity size={14} />
                    <strong>{activities.length}</strong>{' '}
                    {t('social.activityCount', { count: activities.length })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.socialPage__loading}>
              <div className={styles.socialPage__loadingSpinner} />
              <p>{t('common.loading')}</p>
            </div>
          ) : (
            <>
              {/* Sesiones de escucha */}
              <SessionSection
                onCreateSession={createSessionModal.open}
                onJoinSession={joinSessionModal.open}
              />

              {/* Listening Now */}
              <ListeningNowSection
                listeningUsers={actuallyListening}
                onUserClick={handleUserClick}
              />

              {/* Main Layout */}
              <div className={styles.mainLayout}>
                <div className={styles.mainLayout__feed}>
                  <ActivityFeed
                    activities={activities}
                    onUserClick={handleUserClick}
                    onTargetClick={handleTargetClick}
                  />
                </div>

                <div className={styles.mainLayout__sidebar}>
                  {overview?.pendingRequests && (
                    <PendingRequestsSection
                      received={overview.pendingRequests.received}
                      sent={overview.pendingRequests.sent}
                      onAccept={handleAcceptRequest}
                      onReject={handleRejectRequest}
                      isAccepting={acceptRequestMutation.isPending}
                      isRemoving={removeFriendshipMutation.isPending}
                    />
                  )}

                  <FriendsSection
                    friends={friends}
                    listeningUsers={actuallyListening}
                    onFriendClick={handleUserClick}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modales de sesiones */}
      {createSessionModal.isOpen && <CreateSessionModal onClose={createSessionModal.close} />}
      {joinSessionModal.isOpen && <JoinSessionModal onClose={joinSessionModal.close} />}
    </div>
  );
}
