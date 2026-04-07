import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Check, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { ToggleSwitch } from '@shared/components/ui';
import { usePrivacySettings, useUpdatePrivacySettings } from '@features/settings/hooks';
import styles from './ProfilePage.module.css';

interface PublicProfileCardProps {
  userId?: string;
}

export function PublicProfileCard({ userId }: PublicProfileCardProps) {
  const { t } = useTranslation();
  const { data: privacySettings, isLoading } = usePrivacySettings();
  const { mutate: updatePrivacy, isPending: isSaving, isSuccess } = useUpdatePrivacySettings();

  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [showTopTracks, setShowTopTracks] = useState(true);
  const [showTopArtists, setShowTopArtists] = useState(true);
  const [showTopAlbums, setShowTopAlbums] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (privacySettings) {
      setIsPublicProfile(privacySettings.isPublicProfile);
      setShowTopTracks(privacySettings.showTopTracks);
      setShowTopArtists(privacySettings.showTopArtists);
      setShowTopAlbums(privacySettings.showTopAlbums);
      setShowPlaylists(privacySettings.showPlaylists);
      setBio(privacySettings.bio || '');
    }
  }, [privacySettings]);

  const hasChanges =
    privacySettings &&
    (isPublicProfile !== privacySettings.isPublicProfile ||
      showTopTracks !== privacySettings.showTopTracks ||
      showTopArtists !== privacySettings.showTopArtists ||
      showTopAlbums !== privacySettings.showTopAlbums ||
      showPlaylists !== privacySettings.showPlaylists ||
      (bio.trim() || '') !== (privacySettings.bio || ''));

  const handleSave = () => {
    updatePrivacy({
      isPublicProfile,
      showTopTracks,
      showTopArtists,
      showTopAlbums,
      showPlaylists,
      bio: bio.trim() || null,
    });
  };

  return (
    <div className={styles.profilePage__card}>
      <div className={styles.profilePage__cardHeader}>
        <h2>
          <Eye size={20} /> {t('profile.publicProfile')}
        </h2>
      </div>
      <div className={styles.profilePage__cardBody}>
        {isLoading ? (
          <div className={styles.profilePage__loading}>{t('common.loading')}</div>
        ) : (
          <>
            <ToggleSwitch
              label={t('profile.publicProfileToggle')}
              description={t('profile.publicProfileDescription')}
              checked={isPublicProfile}
              onChange={setIsPublicProfile}
            />

            {isPublicProfile && (
              <>
                <ToggleSwitch
                  label={t('profile.showTopTracks')}
                  description={t('profile.showTopTracksDesc')}
                  checked={showTopTracks}
                  onChange={setShowTopTracks}
                />
                <ToggleSwitch
                  label={t('profile.showTopArtists')}
                  description={t('profile.showTopArtistsDesc')}
                  checked={showTopArtists}
                  onChange={setShowTopArtists}
                />
                <ToggleSwitch
                  label={t('profile.showTopAlbums')}
                  description={t('profile.showTopAlbumsDesc')}
                  checked={showTopAlbums}
                  onChange={setShowTopAlbums}
                />
                <ToggleSwitch
                  label={t('profile.showPublicPlaylists')}
                  description={t('profile.showPublicPlaylistsDesc')}
                  checked={showPlaylists}
                  onChange={setShowPlaylists}
                />

                <div
                  className={styles.profilePage__toggleItem}
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div className={styles.profilePage__toggleInfo}>
                    <span className={styles.profilePage__toggleLabel}>
                      {t('profile.biography')}
                    </span>
                    <p className={styles.profilePage__toggleDescription}>
                      {t('profile.biographyDescription')}
                    </p>
                  </div>
                  <textarea
                    className={styles.profilePage__textarea}
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    placeholder={t('profile.biographyPlaceholder')}
                    maxLength={500}
                  />
                  <div className={styles.profilePage__charCount}>{bio.length}/500</div>
                </div>
              </>
            )}

            {hasChanges && (
              <button
                className={styles.profilePage__submitButton}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('common.saveChanges')}
              </button>
            )}

            {isSuccess && !hasChanges && (
              <div className={styles.profilePage__alert_success}>
                <Check size={18} /> {t('profile.settingsSaved')}
              </div>
            )}

            {isPublicProfile && userId && (
              <Link href={`/user/${userId}`} className={styles.profilePage__previewLink}>
                <ExternalLink size={16} /> {t('profile.viewPublicProfile')}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
