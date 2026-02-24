import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Users, Search, X, UserPlus, CheckCircle, Share2, Globe, Music } from 'lucide-react';
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Show discovery section when content is sparse
  const isSparse = friends.length < 5 && activities.length < 5;

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
          {/* Compact Hero */}
          <div className={styles.hero}>
            <div className={styles.hero__glow} />
            <div className={styles.hero__inner}>
              <div className={styles.hero__text}>
                <h1 className={styles.hero__title}>Social</h1>
                <p className={styles.hero__subtitle}>
                  Conecta con tus amigos y descubre qué están escuchando
                </p>
              </div>
              <div className={styles.hero__badges}>
                <span className={styles.hero__badge}>
                  <Users size={13} />
                  {friends.length} amigo{friends.length !== 1 ? 's' : ''}
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

              {/* Discovery Cards - shown when content is sparse */}
              {isSparse && (
                <div className={styles.discovery}>
                  <h3 className={styles.discovery__title}>Haz crecer tu comunidad</h3>
                  <div className={styles.discovery__grid}>
                    <button
                      className={styles.discoveryCard}
                      onClick={() => {
                        const searchInput = document.querySelector(`.${styles.headerSearch__input}`) as HTMLInputElement;
                        if (searchInput) searchInput.focus();
                      }}
                    >
                      <div className={`${styles.discoveryCard__icon} ${styles['discoveryCard__icon--search']}`}>
                        <UserPlus size={22} />
                      </div>
                      <div className={styles.discoveryCard__content}>
                        <span className={styles.discoveryCard__heading}>Encuentra amigos</span>
                        <span className={styles.discoveryCard__desc}>Busca por nombre o usuario</span>
                      </div>
                    </button>

                    <button
                      className={styles.discoveryCard}
                      onClick={() => setLocation('/playlists')}
                    >
                      <div className={`${styles.discoveryCard__icon} ${styles['discoveryCard__icon--playlist']}`}>
                        <Music size={22} />
                      </div>
                      <div className={styles.discoveryCard__content}>
                        <span className={styles.discoveryCard__heading}>Comparte una playlist</span>
                        <span className={styles.discoveryCard__desc}>Hazla pública para tus amigos</span>
                      </div>
                    </button>

                    <button
                      className={styles.discoveryCard}
                      onClick={() => setLocation('/settings/profile')}
                    >
                      <div className={`${styles.discoveryCard__icon} ${styles['discoveryCard__icon--profile']}`}>
                        <Globe size={22} />
                      </div>
                      <div className={styles.discoveryCard__content}>
                        <span className={styles.discoveryCard__heading}>Perfil público</span>
                        <span className={styles.discoveryCard__desc}>Actívalo para que te descubran</span>
                      </div>
                    </button>

                    <button
                      className={styles.discoveryCard}
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({ title: 'Echo Music', url: window.location.origin });
                        }
                      }}
                    >
                      <div className={`${styles.discoveryCard__icon} ${styles['discoveryCard__icon--share']}`}>
                        <Share2 size={22} />
                      </div>
                      <div className={styles.discoveryCard__content}>
                        <span className={styles.discoveryCard__heading}>Invita a alguien</span>
                        <span className={styles.discoveryCard__desc}>Comparte Echo con amigos</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
