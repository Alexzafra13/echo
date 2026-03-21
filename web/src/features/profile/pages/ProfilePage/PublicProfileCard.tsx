import { useState, useEffect } from 'react';
import { Eye, Check, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { ToggleSwitch } from '@shared/components/ui';
import { usePrivacySettings, useUpdatePrivacySettings } from '@features/settings/hooks';
import styles from './ProfilePage.module.css';

interface PublicProfileCardProps {
  userId?: string;
}

export function PublicProfileCard({ userId }: PublicProfileCardProps) {
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
        <h2><Eye size={20} /> Perfil Público</h2>
      </div>
      <div className={styles.profilePage__cardBody}>
        {isLoading ? (
          <div className={styles.profilePage__loading}>Cargando...</div>
        ) : (
          <>
            <ToggleSwitch label="Perfil público" description="Permite que otros usuarios vean tu perfil y estadísticas de escucha" checked={isPublicProfile} onChange={setIsPublicProfile} />

            {isPublicProfile && (
              <>
                <ToggleSwitch label="Mostrar top canciones" description="Muestra tus canciones más escuchadas en tu perfil" checked={showTopTracks} onChange={setShowTopTracks} />
                <ToggleSwitch label="Mostrar top artistas" description="Muestra tus artistas más escuchados en tu perfil" checked={showTopArtists} onChange={setShowTopArtists} />
                <ToggleSwitch label="Mostrar top álbumes" description="Muestra tus álbumes más escuchados en tu perfil" checked={showTopAlbums} onChange={setShowTopAlbums} />
                <ToggleSwitch label="Mostrar playlists públicas" description="Muestra tus playlists marcadas como públicas en tu perfil" checked={showPlaylists} onChange={setShowPlaylists} />

                <div className={styles.profilePage__toggleItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div className={styles.profilePage__toggleInfo}>
                    <span className={styles.profilePage__toggleLabel}>Biografía</span>
                    <p className={styles.profilePage__toggleDescription}>Cuéntales a otros usuarios sobre tus gustos musicales</p>
                  </div>
                  <textarea className={styles.profilePage__textarea} value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} placeholder="Escribe algo sobre ti..." maxLength={500} />
                  <div className={styles.profilePage__charCount}>{bio.length}/500</div>
                </div>
              </>
            )}

            {hasChanges && (
              <button className={styles.profilePage__submitButton} onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            )}

            {isSuccess && !hasChanges && (
              <div className={styles.profilePage__alert_success}><Check size={18} /> Configuración guardada</div>
            )}

            {isPublicProfile && userId && (
              <Link href={`/user/${userId}`} className={styles.profilePage__previewLink}>
                <ExternalLink size={16} /> Ver mi perfil público
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
