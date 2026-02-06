import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Users, Search, X, UserPlus, CheckCircle } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
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
 * Premium redesign with hero header, asymmetric layout, and integrated search
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

  // Enable real-time SSE updates for "listening now"
  useListeningNowSSE();

  const sendRequestMutation = useSendFriendRequest();
  const acceptRequestMutation = useAcceptFriendRequest();
  const removeFriendshipMutation = useRemoveFriendship();

  // Clear success message after 3 seconds
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

  // Filter users who are actually playing
  const actuallyListening = overview?.listeningNow?.filter((u) => u.isPlaying) || [];
  const pendingReceived = overview?.pendingRequests?.received?.length || 0;

  return (
    <div className={styles.socialPage}>
      <Sidebar />

      <main className={styles.socialPage__main}>
        <Header disableSearch />

        <div className={styles.socialPage__content}>
          {/* Hero Header */}
          <div className={styles.hero}>
            <div className={styles.hero__glow} />
            <div className={styles.hero__glowSecondary} />
            <div className={styles.hero__inner}>
              <div className={styles.hero__top}>
                <div className={styles.hero__titleBlock}>
                  <h1 className={styles.hero__title}>
                    <Users size={32} />
                    Social
                  </h1>
                  <p className={styles.hero__subtitle}>
                    Conecta con tus amigos y descubre qué están escuchando
                  </p>
                </div>
                <div className={styles.hero__badges}>
                  <span className={styles.hero__badge}>
                    <Users size={14} />
                    {overview?.friends?.length || 0} amigos
                  </span>
                  {actuallyListening.length > 0 && (
                    <span className={`${styles.hero__badge} ${styles['hero__badge--live']}`}>
                      <span className={styles.hero__liveDot} />
                      {actuallyListening.length} escuchando
                    </span>
                  )}
                  {pendingReceived > 0 && (
                    <span className={`${styles.hero__badge} ${styles['hero__badge--pending']}`}>
                      {pendingReceived} pendiente{pendingReceived !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Integrated Search */}
              <div className={styles.hero__searchRow}>
                <div className={styles.hero__searchWrapper}>
                  <Search size={18} className={styles.hero__searchIcon} />
                  <input
                    type="text"
                    placeholder="Buscar usuarios por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.hero__searchInput}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={styles.hero__searchClear}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Results Dropdown */}
              {searchQuery.length >= 2 && (
                <div className={styles.hero__searchResults}>
                  {searchResults && searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <div key={user.id} className={styles.searchResult}>
                        <img
                          src={user.avatarUrl || `/api/users/${user.id}/avatar`}
                          alt={user.username}
                          className={styles.searchResult__avatar}
                          onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                        />
                        <div className={styles.searchResult__info}>
                          <span className={styles.searchResult__name}>
                            {user.name || user.username}
                          </span>
                          <span className={styles.searchResult__username}>
                            @{user.username}
                          </span>
                        </div>
                        {user.friendshipStatus === 'accepted' ? (
                          <span className={styles.searchResult__status}>
                            Amigos
                          </span>
                        ) : user.friendshipStatus === 'pending' ? (
                          <span className={styles.searchResult__statusPending}>
                            Pendiente
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSendRequest(user.id, user.name || user.username)}
                            disabled={sendRequestMutation.isPending}
                          >
                            <UserPlus size={16} />
                            Añadir
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={styles.hero__searchEmpty}>
                      No se encontraron usuarios
                    </div>
                  )}
                </div>
              )}

              {/* Success message */}
              {successMessage && (
                <div className={styles.hero__successMessage}>
                  <CheckCircle size={16} />
                  {successMessage}
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className={styles.socialPage__loading}>
              <div className={styles.socialPage__loadingSpinner} />
              <p>Cargando...</p>
            </div>
          ) : (
            <>
              {/* Listening Now Section */}
              <ListeningNowSection
                listeningUsers={actuallyListening}
                onUserClick={handleUserClick}
              />

              {/* Asymmetric Layout: Feed + Sidebar */}
              <div className={styles.mainLayout}>
                {/* Primary Column: Activity Feed */}
                <div className={styles.mainLayout__feed}>
                  <ActivityFeed
                    activities={overview?.recentActivity || []}
                    onUserClick={handleUserClick}
                    onTargetClick={handleTargetClick}
                  />
                </div>

                {/* Secondary Column: Friends + Pending */}
                <div className={styles.mainLayout__sidebar}>
                  {/* Pending Requests */}
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

                  {/* Friends Section */}
                  <FriendsSection
                    friends={overview?.friends || []}
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
