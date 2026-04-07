import { useTranslation } from 'react-i18next';
import { Search, X, UserPlus, Check, Clock, CheckCircle } from 'lucide-react';
import { Button, UserAvatar } from '@shared/components/ui';
import type { SearchUserResult } from '../../../services/social.service';
import styles from '../SocialPage.module.css';

interface SearchUsersPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: SearchUserResult[] | undefined;
  onSendRequest: (userId: string, userName: string) => void;
  isSending: boolean;
  successMessage: string | null;
}

export function SearchUsersPanel({
  searchQuery,
  onSearchChange,
  searchResults,
  onSendRequest,
  isSending,
  successMessage,
}: SearchUsersPanelProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.socialPage__search}>
      <div className={styles.socialPage__searchWrapper}>
        <Search size={20} className={styles.socialPage__searchIcon} />
        <input
          type="text"
          placeholder={t('social.searchUsersByNamePlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={styles.socialPage__searchInput}
          autoFocus
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className={styles.socialPage__searchClear}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchResults && searchResults.length > 0 && (
        <div className={styles.socialPage__searchResults}>
          {searchResults.map((user) => (
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
                <span className={styles.searchResult__status}>
                  <Check size={14} /> {t('social.friendStatus')}
                </span>
              ) : user.friendshipStatus === 'pending' ? (
                <span className={styles.searchResult__statusPending}>
                  <Clock size={14} /> {t('social.pendingStatus')}
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onSendRequest(user.id, user.name || user.username)}
                  disabled={isSending}
                >
                  <UserPlus size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {searchQuery.length >= 2 && searchResults?.length === 0 && (
        <div className={styles.socialPage__searchEmpty}>{t('social.noUsersFound')}</div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className={styles.socialPage__successMessage}>
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}
    </div>
  );
}
