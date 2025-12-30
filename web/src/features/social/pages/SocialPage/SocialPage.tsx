import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Users, UserPlus } from 'lucide-react';
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
import {
  SearchUsersPanel,
  ListeningNowSection,
  StatsBar,
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
  const [showSearch, setShowSearch] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: overview, isLoading } = useSocialOverview();
  const { data: searchResults, refetch: refetchSearch } = useSearchUsers(
    searchQuery,
    showSearch && searchQuery.length >= 2
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
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptRequestMutation.mutateAsync(friendshipId);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await removeFriendshipMutation.mutateAsync(friendshipId);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleUserClick = (userId: string) => setLocation(`/user/${userId}`);
  const handleTargetClick = (url: string) => setLocation(url);

  // Filter users who are actually playing
  const actuallyListening = overview?.listeningNow?.filter((u) => u.isPlaying) || [];

  return (
    <div className={styles.socialPage}>
      <Sidebar />

      <main className={styles.socialPage__main}>
        <Header disableSearch />

        <div className={styles.socialPage__content}>
          {/* Page Header */}
          <div className={styles.socialPage__header}>
            <div className={styles.socialPage__titleRow}>
              <div>
                <h1 className={styles.socialPage__title}>
                  <Users size={28} />
                  Social
                </h1>
                <p className={styles.socialPage__subtitle}>
                  Conecta con tus amigos y descubre qué están escuchando
                </p>
              </div>
              <Button variant="primary" onClick={() => setShowSearch(!showSearch)}>
                <UserPlus size={20} />
                Añadir amigo
              </Button>
            </div>

            {/* Search Users */}
            {showSearch && (
              <SearchUsersPanel
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchResults={searchResults}
                onSendRequest={handleSendRequest}
                isSending={sendRequestMutation.isPending}
                successMessage={successMessage}
              />
            )}
          </div>

          {isLoading ? (
            <div className={styles.socialPage__loading}>
              <div className={styles.socialPage__loadingSpinner} />
              <p>Cargando...</p>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <StatsBar
                friendsCount={overview?.friends?.length || 0}
                pendingCount={overview?.pendingRequests?.received?.length || 0}
                listeningCount={actuallyListening.length}
                activityCount={overview?.recentActivity?.length || 0}
              />

              {/* Listening Now Section */}
              <ListeningNowSection
                listeningUsers={actuallyListening}
                onUserClick={handleUserClick}
              />

              {/* Main Grid */}
              <div className={styles.socialPage__grid}>
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
                  onFriendClick={handleUserClick}
                  onShowSearch={() => setShowSearch(true)}
                />

                {/* Activity Feed */}
                <ActivityFeed
                  activities={overview?.recentActivity || []}
                  onUserClick={handleUserClick}
                  onTargetClick={handleTargetClick}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
