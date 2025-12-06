import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Users, UserPlus, Music, Activity, Search, X, Check, Clock, Send, CheckCircle, Headphones } from 'lucide-react';
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
import { Equalizer } from '../../components/Equalizer';
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
  const { data: searchResults, refetch: refetchSearch } = useSearchUsers(searchQuery, showSearch && searchQuery.length >= 2);

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
      // Refetch search to update the status
      refetchSearch();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptRequestMutation.mutateAsync(friendshipId);
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await removeFriendshipMutation.mutateAsync(friendshipId);
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    return `hace ${diffDays}d`;
  };

  const getActionText = (actionType: string) => {
    switch (actionType) {
      case 'created_playlist':
        return 'creó la playlist';
      case 'liked_track':
        return 'le gustó';
      case 'liked_album':
        return 'le gustó el álbum';
      case 'liked_artist':
        return 'le gustó el artista';
      case 'played_track':
        return 'escuchó';
      default:
        return actionType;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created_playlist':
        return '📋';
      case 'liked_track':
      case 'liked_album':
      case 'liked_artist':
        return '❤️';
      case 'played_track':
        return '🎵';
      default:
        return '•';
    }
  };

  return (
    <div className={styles.socialPage}>
      <Sidebar />

      <main className={styles.socialPage__main}>
        <Header />

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
              <Button
                variant="primary"
                onClick={() => setShowSearch(!showSearch)}
              >
                <UserPlus size={20} />
                Añadir amigo
              </Button>
            </div>

            {/* Search Users */}
            {showSearch && (
              <div className={styles.socialPage__search}>
                <div className={styles.socialPage__searchWrapper}>
                  <Search size={20} className={styles.socialPage__searchIcon} />
                  <input
                    type="text"
                    placeholder="Buscar usuarios por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.socialPage__searchInput}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={styles.socialPage__searchClear}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Search Results */}
                {searchResults && searchResults.length > 0 && (
                  <div className={styles.socialPage__searchResults}>
                    {searchResults.map((user) => (
                      <div key={user.id} className={styles.searchResult}>
                        <img
                          src={user.avatarUrl || getUserAvatarUrl(user.id, false)}
                          alt={user.username}
                          className={styles.searchResult__avatar}
                          onError={handleAvatarError}
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
                            <Check size={14} /> Amigos
                          </span>
                        ) : user.friendshipStatus === 'pending' ? (
                          <span className={styles.searchResult__statusPending}>
                            <Clock size={14} /> Pendiente
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
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults?.length === 0 && (
                  <div className={styles.socialPage__searchEmpty}>
                    No se encontraron usuarios
                  </div>
                )}

                {/* Success message */}
                {successMessage && (
                  <div className={styles.socialPage__successMessage}>
                    <CheckCircle size={18} />
                    {successMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className={styles.socialPage__loading}>
              <div className={styles.socialPage__loadingSpinner} />
              <p>Cargando...</p>
            </div>
          ) : (
            <>
              {/* Featured: Listening Now Section */}
              <section className={styles.listeningSection}>
                <div className={styles.listeningSection__header}>
                  <h2 className={styles.listeningSection__title}>
                    <Headphones size={22} />
                    Escuchando ahora
                  </h2>
                  {overview?.listeningNow && overview.listeningNow.length > 0 && (
                    <span className={styles.listeningSection__count}>
                      {overview.listeningNow.length} {overview.listeningNow.length === 1 ? 'amigo' : 'amigos'}
                    </span>
                  )}
                </div>

                {overview?.listeningNow && overview.listeningNow.length > 0 ? (
                  <div className={styles.listeningGrid}>
                    {overview.listeningNow.map((user) => (
                      <div
                        key={user.id}
                        className={styles.listeningCard}
                        onClick={() => setLocation(`/user/${user.id}`)}
                      >
                        {/* User Avatar */}
                        <img
                          src={user.avatarUrl || getUserAvatarUrl(user.id, false)}
                          alt={user.username}
                          className={styles.listeningCard__avatar}
                          onError={handleAvatarError}
                        />

                        {/* Album Cover */}
                        <div className={styles.listeningCard__coverWrapper}>
                          {user.currentTrack?.coverUrl ? (
                            <img
                              src={user.currentTrack.coverUrl}
                              alt={user.currentTrack.albumName}
                              className={styles.listeningCard__cover}
                            />
                          ) : (
                            <div className={styles.listeningCard__coverPlaceholder}>
                              <Music size={20} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className={styles.listeningCard__info}>
                          <span className={styles.listeningCard__name}>
                            {user.name || user.username}
                          </span>
                          {user.currentTrack ? (
                            <>
                              <span className={styles.listeningCard__trackTitle}>
                                {user.currentTrack.title}
                              </span>
                              <span className={styles.listeningCard__trackArtist}>
                                {user.currentTrack.artistName}
                              </span>
                            </>
                          ) : (
                            <span className={styles.listeningCard__offline}>
                              Sin reproducir
                            </span>
                          )}
                        </div>

                        {/* Equalizer */}
                        {user.isPlaying && (
                          <div className={styles.listeningCard__equalizer}>
                            <Equalizer size="sm" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.listeningSection__empty}>
                    <div className={styles.listeningSection__emptyIcon}>
                      <Headphones size={40} />
                    </div>
                    <p>Ningún amigo está escuchando ahora</p>
                    <span>Cuando tus amigos reproduzcan música, aparecerán aquí</span>
                  </div>
                )}
              </section>

              {/* Main Grid */}
              <div className={styles.socialPage__grid}>
                {/* Pending Requests Section - Received */}
                {overview?.pendingRequests && overview.pendingRequests.received.length > 0 && (
                  <section className={styles.section}>
                    <h2 className={styles.section__title}>
                      <div className={styles.section__titleIcon}>
                        <Clock size={18} />
                      </div>
                      Solicitudes recibidas
                      <span className={styles.section__badge}>
                        {overview.pendingRequests.received.length}
                      </span>
                    </h2>
                    <div className={styles.requestsList}>
                      {overview.pendingRequests.received.map((request) => (
                        <div key={request.friendshipId} className={styles.requestCard}>
                          <img
                            src={request.avatarUrl || getUserAvatarUrl(request.id, false)}
                            alt={request.username}
                            className={styles.requestCard__avatar}
                            onError={handleAvatarError}
                          />
                          <div className={styles.requestCard__info}>
                            <span className={styles.requestCard__name}>
                              {request.name || request.username}
                            </span>
                            <span className={styles.requestCard__text}>
                              quiere ser tu amigo
                            </span>
                          </div>
                          <div className={styles.requestCard__actions}>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAcceptRequest(request.friendshipId)}
                              disabled={acceptRequestMutation.isPending}
                            >
                              <Check size={16} />
                              Aceptar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectRequest(request.friendshipId)}
                              disabled={removeFriendshipMutation.isPending}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Pending Requests Section - Sent */}
                {overview?.pendingRequests && overview.pendingRequests.sent.length > 0 && (
                  <section className={styles.section}>
                    <h2 className={styles.section__title}>
                      <div className={styles.section__titleIcon}>
                        <Send size={18} />
                      </div>
                      Solicitudes enviadas
                      <span className={styles.section__badge}>
                        {overview.pendingRequests.sent.length}
                      </span>
                    </h2>
                    <div className={styles.requestsList}>
                      {overview.pendingRequests.sent.map((request) => (
                        <div key={request.friendshipId} className={styles.requestCard}>
                          <img
                            src={request.avatarUrl || getUserAvatarUrl(request.id, false)}
                            alt={request.username}
                            className={styles.requestCard__avatar}
                            onError={handleAvatarError}
                          />
                          <div className={styles.requestCard__info}>
                            <span className={styles.requestCard__name}>
                              {request.name || request.username}
                            </span>
                            <span className={styles.requestCard__textSent}>
                              Esperando respuesta...
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRejectRequest(request.friendshipId)}
                            disabled={removeFriendshipMutation.isPending}
                            title="Cancelar solicitud"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Friends Section */}
                <section className={styles.section}>
                  <h2 className={styles.section__title}>
                    <div className={styles.section__titleIcon}>
                      <Users size={18} />
                    </div>
                    Mis amigos
                    <span className={styles.section__count}>
                      {overview?.friends?.length || 0}
                    </span>
                  </h2>
                  {overview?.friends && overview.friends.length > 0 ? (
                    <div className={styles.friendsList}>
                      {overview.friends.map((friend) => (
                        <div
                          key={friend.id}
                          className={styles.friendCard}
                          onClick={() => setLocation(`/user/${friend.id}`)}
                        >
                          <img
                            src={friend.avatarUrl || getUserAvatarUrl(friend.id, false)}
                            alt={friend.username}
                            className={styles.friendCard__avatar}
                            onError={handleAvatarError}
                          />
                          <div className={styles.friendCard__info}>
                            <span className={styles.friendCard__name}>
                              {friend.name || friend.username}
                            </span>
                            <span className={styles.friendCard__username}>
                              @{friend.username}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.section__empty}>
                      <Users size={32} />
                      <p>Aún no tienes amigos</p>
                      <Button
                        variant="secondary"
                        onClick={() => setShowSearch(true)}
                      >
                        <UserPlus size={16} />
                        Buscar usuarios
                      </Button>
                    </div>
                  )}
                </section>

                {/* Activity Feed Section */}
                <section className={styles.section}>
                  <h2 className={styles.section__title}>
                    <div className={styles.section__titleIcon}>
                      <Activity size={18} />
                    </div>
                    Actividad reciente
                  </h2>
                  {overview?.recentActivity && overview.recentActivity.length > 0 ? (
                    <div className={styles.activityList}>
                      {overview.recentActivity.map((activity) => (
                        <div key={activity.id} className={styles.activityItem}>
                          <div className={styles.activityItem__avatarWrapper}>
                            <img
                              src={activity.user.avatarUrl || getUserAvatarUrl(activity.user.id, false)}
                              alt={activity.user.username}
                              className={styles.activityItem__avatar}
                              onError={handleAvatarError}
                            />
                            <span className={styles.activityItem__icon}>
                              {getActionIcon(activity.actionType)}
                            </span>
                          </div>
                          <div className={styles.activityItem__content}>
                            <span className={styles.activityItem__text}>
                              <strong>{activity.user.name || activity.user.username}</strong>
                              {' '}
                              {getActionText(activity.actionType)}
                              {' '}
                              <strong>{activity.targetName}</strong>
                            </span>
                            <span className={styles.activityItem__time}>
                              {formatTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.section__empty}>
                      <Activity size={32} />
                      <p>No hay actividad reciente</p>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
