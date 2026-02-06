import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Users, Search, X, UserPlus, CheckCircle, TrendingUp } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
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
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: overview, isLoading } = useSocialOverview();
  const { data: searchResults, refetch: refetchSearch } = useSearchUsers(
    searchQuery,
    searchQuery.length >= 2
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
          <button onClick={() => setSearchQuery('')} className={styles.headerSearch__clear}>
            <X size={16} />
          </button>
        )}
      </div>
      {/* Search Results Dropdown */}
      {searchQuery.length >= 2 && (
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
          {/* Success message */}
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
          {/* Hero Banner */}
          <div className={styles.hero}>
            <div className={styles.hero__glow} />
            <div className={styles.hero__glowSecondary} />

            {/* Decorative floating circles */}
            <div className={styles.hero__circles}>
              <span className={styles.hero__circle} />
              <span className={`${styles.hero__circle} ${styles['hero__circle--2']}`} />
              <span className={`${styles.hero__circle} ${styles['hero__circle--3']}`} />
            </div>

            <div className={styles.hero__inner}>
              <div className={styles.hero__left}>
                <h1 className={styles.hero__title}>Social</h1>
                <p className={styles.hero__subtitle}>
                  Conecta con tus amigos y descubre qué están escuchando
                </p>
                <div className={styles.hero__badges}>
                  <span className={styles.hero__badge}>
                    <Users size={13} />
                    {friends.length} amigos
                  </span>
                  {actuallyListening.length > 0 && (
                    <span className={`${styles.hero__badge} ${styles['hero__badge--live']}`}>
                      <span className={styles.hero__liveDot} />
                      {actuallyListening.length} en vivo
                    </span>
                  )}
                  {pendingReceived > 0 && (
                    <span className={`${styles.hero__badge} ${styles['hero__badge--pending']}`}>
                      {pendingReceived} pendiente{pendingReceived !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Friend avatars stack */}
              {friends.length > 0 && (
                <div className={styles.hero__avatars}>
                  <div className={styles.hero__avatarStack}>
                    {friends.slice(0, 5).map((friend, i) => (
                      <img
                        key={friend.id}
                        src={friend.avatarUrl || getUserAvatarUrl(friend.id, false)}
                        alt={friend.name || friend.username}
                        className={styles.hero__stackAvatar}
                        style={{ zIndex: 5 - i }}
                        loading="lazy"
                        decoding="async"
                        onError={handleAvatarError}
                      />
                    ))}
                    {friends.length > 5 && (
                      <span className={styles.hero__stackMore}>
                        +{friends.length - 5}
                      </span>
                    )}
                  </div>
                  <span className={styles.hero__avatarLabel}>Tu comunidad</span>
                </div>
              )}
            </div>

            {/* Quick action pills */}
            <div className={styles.hero__actions}>
              <button className={styles.hero__actionPill} onClick={() => setLocation('/trending')}>
                <TrendingUp size={14} />
                Tendencias
              </button>
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
