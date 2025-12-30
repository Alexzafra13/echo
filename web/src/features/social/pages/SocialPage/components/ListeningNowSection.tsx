import { Headphones, Music } from 'lucide-react';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { Equalizer } from '../../../components/Equalizer';
import type { ListeningUser } from '../../../services/social.service';
import styles from '../SocialPage.module.css';

interface ListeningNowSectionProps {
  listeningUsers: ListeningUser[];
  onUserClick: (userId: string) => void;
}

export function ListeningNowSection({ listeningUsers, onUserClick }: ListeningNowSectionProps) {
  if (listeningUsers.length === 0) return null;

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
          {listeningUsers.length} {listeningUsers.length === 1 ? 'amigo' : 'amigos'}
        </span>
      </div>

      <div className={styles.listeningGrid}>
        {listeningUsers.map((user) => (
          <div
            key={user.id}
            className={styles.listeningCard}
            onClick={() => onUserClick(user.id)}
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
}
