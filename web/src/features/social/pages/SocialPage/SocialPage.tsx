import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Users, Search, X, UserPlus, CheckCircle, Headphones, Activity } from 'lucide-react';
import { useDocumentTitle } from '@shared/hooks';
import { useDominantColor } from '@shared/hooks/useDominantColor';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
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
import styles from './SocialPage.module.css';

/**
 * SocialPage Component
 * Main social hub: friends, listening now, activity feed
 */
export default function SocialPage() {
  useDocumentTitle('Social');
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.user);

  const avatarUrl = useMemo(
    () => currentUser ? getUserAvatarUrl(currentUser.id, currentUser.hasAvatar) : null,
    [currentUser]
  );
  const dominantColor = useDominantColor(avatarUrl);

  // Debounce search query to avoid firing a request on every keystroke
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
      setSuccessMessage(`Solicitud enviada a ${userName}`);
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

  // Search component for Header
  const headerSearch = (
    <div className={styles.headerSearch}>
      <div className={styles.headerSearch__wrapper}>
        <Search size={18} className={styles.headerSearch__icon} />
        <input
          type="text"
          placeholder="Buscar usuarios..."
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
                <img
                  src={user.avatarUrl || getUserAvatarUrl(user.id, false)}
                  alt={user.username}
                  className={styles.searchResult__avatar}
                  onError={handleAvatarError}
                />
                <div className={styles.searchResult__info}>
                  <span className={styles.searchResult__name}>{user.name || user.username}</span>
                  <span className={styles.searchResult__username}>@{user.username}</span>
                </div>
                {user.friendshipStatus === 'accepted' ? (
                  <span className={styles.searchResult__status}>Amigos</span>
                ) : user.friendshipStatus === 'pending' ? (
                  <span className={styles.searchResult__statusPending}>Pendiente</span>
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
            <div className={styles.headerSearch__empty}>No se encontraron usuarios</div>
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
              <img
                src={avatarUrl || ''}
                alt={currentUser?.username || ''}
                className={styles.profileHero__avatar}
                onClick={() => currentUser && handleUserClick(currentUser.id)}
                onError={handleAvatarError}
              />
              <div className={styles.profileHero__info}>
                <h1 className={styles.profileHero__name}>
                  {currentUser?.name || currentUser?.username}
                </h1>
                <span className={styles.profileHero__username}>
                  @{currentUser?.username}
                </span>
                <div className={styles.profileHero__stats}>
                  <span className={styles.profileHero__stat}>
                    <Users size={14} />
                    <strong>{friends.length}</strong> amigo{friends.length !== 1 ? 's' : ''}
                  </span>
                  {actuallyListening.length > 0 && (
                    <span className={`${styles.profileHero__stat} ${styles['profileHero__stat--live']}`}>
                      <Headphones size={14} />
                      <strong>{actuallyListening.length}</strong> escuchando
                    </span>
                  )}
                  {pendingReceived > 0 && (
                    <span className={`${styles.profileHero__stat} ${styles['profileHero__stat--pending']}`}>
                      <UserPlus size={14} />
                      <strong>{pendingReceived}</strong> pendiente{pendingReceived !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={styles.profileHero__stat}>
                    <Activity size={14} />
                    <strong>{activities.length}</strong> actividad{activities.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.socialPage__loading}>
              <div className={styles.socialPage__loadingSpinner} />
              <p>Cargando...</p>
            </div>
          ) : (
            <>
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
    </div>
  );
}
