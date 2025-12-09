import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Users, UserPlus, Music, Activity, Search, X, Check, Clock, Send, CheckCircle, Headphones } from 'lucide-react';
import { Sidebar } from '@features/home/components';
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { formatTimeAgo } from '@shared/utils/date.utils';
import {
  useSocialOverview,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriendship,
  useSearchUsers,
} from '../../hooks';
import { useListeningNowSSE } from '../../hooks/useListeningSSE';
import { Equalizer } from '../../components/Equalizer';
import { getActionText, getActionIcon, getTargetUrl } from '../../utils/socialFormatters';
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
              {/* Stats Bar */}
              {(() => {
                // Only count users who are actually playing
                const actuallyListening = overview?.listeningNow?.filter(u => u.isPlaying) || [];
                return (
                  <div className={styles.statsBar}>
                    <div className={styles.statItem}>
                      <div className={styles.statItem__icon}>
                        <Users size={20} />
                      </div>
                      <div className={styles.statItem__info}>
                        <span className={styles.statItem__value}>{overview?.friends?.length || 0}</span>
                        <span className={styles.statItem__label}>Amigos</span>
                      </div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statItem__icon} data-active={(overview?.pendingRequests?.received?.length ?? 0) > 0}>
                        <Clock size={20} />
                      </div>
                      <div className={styles.statItem__info}>
                        <span className={styles.statItem__value}>{overview?.pendingRequests?.received?.length || 0}</span>
                        <span className={styles.statItem__label}>Pendientes</span>
                      </div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statItem__icon} data-listening={actuallyListening.length > 0}>
                        <Headphones size={20} />
                      </div>
                      <div className={styles.statItem__info}>
                        <span className={styles.statItem__value}>{actuallyListening.length}</span>
                        <span className={styles.statItem__label}>Escuchando</span>
                      </div>
                    </div>
                    <div className={styles.statItem}>
                      <div className={styles.statItem__icon}>
                        <Activity size={20} />
                      </div>
                      <div className={styles.statItem__info}>
                        <span className={styles.statItem__value}>{overview?.recentActivity?.length || 0}</span>
                        <span className={styles.statItem__label}>Actividad</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Featured: Listening Now Section - Only show if someone is actually playing */}
              {(() => {
                const actuallyListening = overview?.listeningNow?.filter(u => u.isPlaying) || [];
                if (actuallyListening.length === 0) return null;

                return (
                  <section className={styles.listeningSection}>
                    <div className={styles.listeningSection__header}>
                      <div className={styles.listeningSection__titleWrapper}>
                        <div className={styles.listeningSection__iconPulse}>
                          <Headphones size={24} />
                        </div>
                        <div>
                          <h2 className={styles.listeningSection__title}>
                            Escuchando ahora
                          </h2>
                          <p className={styles.listeningSection__subtitle}>
                            Música en vivo de tus amigos
                          </p>
                        </div>
                      </div>
                      <span className={styles.listeningSection__count}>
                        {actuallyListening.length} {actuallyListening.length === 1 ? 'amigo' : 'amigos'}
                      </span>
                    </div>

                    <div className={styles.listeningGrid}>
                      {actuallyListening.map((user) => (
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
                  </section>
                );
              })()}

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
                          {/* Left side: Avatar + Content */}
                          <div className={styles.activityItem__left}>
                            <div
                              className={styles.activityItem__avatarWrapper}
                              onClick={() => setLocation(`/user/${activity.user.id}`)}
                            >
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
                              {/* Line 1: User + action text */}
                              <div className={styles.activityItem__actionLine}>
                                <span
                                  className={styles.activityItem__userLink}
                                  onClick={() => setLocation(`/user/${activity.user.id}`)}
                                >
                                  {activity.user.name || activity.user.username}
                                </span>
                                {' '}
                                {getActionText(activity.actionType)}
                                {/* For became_friends, show friend inline */}
                                {activity.actionType === 'became_friends' && activity.secondUser && (
                                  <>
                                    {' '}
                                    <span
                                      className={styles.activityItem__friendLink}
                                      onClick={() => setLocation(`/user/${activity.secondUser!.id}`)}
                                    >
                                      <img
                                        src={activity.secondUser.avatarUrl || getUserAvatarUrl(activity.secondUser.id, false)}
                                        alt={activity.secondUser.username}
                                        className={styles.activityItem__inlineAvatar}
                                        onError={handleAvatarError}
                                      />
                                      <span>{activity.secondUser.name || activity.secondUser.username}</span>
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Line 2: Target name (for non-friend activities) */}
                              {activity.actionType !== 'became_friends' && (
                                <span
                                  className={styles.activityItem__targetLink}
                                  onClick={() => {
                                    const url = getTargetUrl(activity.targetType, activity.targetId, activity.targetAlbumId);
                                    if (url) setLocation(url);
                                  }}
                                >
                                  {activity.targetName}
                                </span>
                              )}

                              {/* Line 3: Timestamp */}
                              <span className={styles.activityItem__time}>
                                {formatTimeAgo(activity.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Right side: Cover (for non-friend activities) */}
                          {activity.actionType !== 'became_friends' && (
                            <div
                              className={styles.activityItem__coverWrapper}
                              onClick={() => {
                                const url = getTargetUrl(activity.targetType, activity.targetId, activity.targetAlbumId);
                                if (url) setLocation(url);
                              }}
                            >
                              {activity.targetAlbumIds && activity.targetAlbumIds.length > 0 ? (
                                <span className={`${styles.activityItem__cover} ${styles.activityItem__mosaic} ${
                                  activity.targetAlbumIds.length === 1 ? styles['activityItem__mosaic--single'] :
                                  activity.targetAlbumIds.length === 2 ? styles['activityItem__mosaic--2'] :
                                  activity.targetAlbumIds.length === 3 ? styles['activityItem__mosaic--3'] :
                                  styles['activityItem__mosaic--4']
                                }`}>
                                  {activity.targetAlbumIds.slice(0, 4).map((albumId) => (
                                    <img
                                      key={albumId}
                                      src={`/api/albums/${albumId}/cover`}
                                      alt=""
                                      className={styles.activityItem__mosaicImg}
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  ))}
                                </span>
                              ) : activity.targetCoverUrl ? (
                                <img
                                  src={activity.targetCoverUrl}
                                  alt={activity.targetName}
                                  className={styles.activityItem__cover}
                                />
                              ) : null}
                            </div>
                          )}
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
