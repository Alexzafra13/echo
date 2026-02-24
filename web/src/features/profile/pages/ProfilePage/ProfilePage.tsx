import { useState, useEffect } from 'react';
import { User, Lock, Calendar, Check, X, Eye, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { ToggleSwitch } from '@shared/components/ui';
import { useAuth, useModal, useDominantColor, useDocumentTitle } from '@shared/hooks';
import { useAuthStore } from '@shared/store';
import { useChangePassword, useUpdateProfile } from '../../hooks';
import { usePrivacySettings, useUpdatePrivacySettings } from '@features/settings/hooks';
// import { AvatarUpload } from '../../components/AvatarUpload'; // Available if needed
import { AvatarEditModal } from '../../components/AvatarEditModal';
import { getUserAvatarUrl, handleAvatarError, getUserInitials } from '@shared/utils/avatar.utils';
import { formatDate } from '@shared/utils/format';
import styles from './ProfilePage.module.css';

/**
 * ProfilePage Component
 * User profile page with account information, name editing, and password change
 */
export function ProfilePage() {
  useDocumentTitle('Mi Perfil');
  const { user } = useAuth();
  const updateUser = useAuthStore((state) => state.updateUser);
  const avatarTimestamp = useAuthStore((state) => state.avatarTimestamp);

  // Dominant color from avatar for dynamic background
  const avatarColorUrl = user?.hasAvatar && user?.id
    ? getUserAvatarUrl(user.id, user.hasAvatar, avatarTimestamp)
    : undefined;
  const dominantColor = useDominantColor(avatarColorUrl, '107, 114, 128');

  // Avatar modal
  const avatarModal = useModal();

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const { mutate: updateProfile, isPending: isUpdatingProfile, isSuccess: profileSuccess } = useUpdateProfile();

  // Password change
  const { mutate: changePassword, isPending: isPendingPassword, isSuccess: passwordSuccess, isError: passwordError, error: passwordErrorObj } = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  // Privacy settings
  const { data: privacySettings, isLoading: isLoadingPrivacy } = usePrivacySettings();
  const { mutate: updatePrivacy, isPending: isSavingPrivacy, isSuccess: privacySuccess } = useUpdatePrivacySettings();
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [showTopTracks, setShowTopTracks] = useState(true);
  const [showTopArtists, setShowTopArtists] = useState(true);
  const [showTopAlbums, setShowTopAlbums] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [bio, setBio] = useState('');

  // Sync name with user
  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  // Sync privacy settings with server data
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

  const hasPrivacyChanges = privacySettings && (
    isPublicProfile !== privacySettings.isPublicProfile ||
    showTopTracks !== privacySettings.showTopTracks ||
    showTopArtists !== privacySettings.showTopArtists ||
    showTopAlbums !== privacySettings.showTopAlbums ||
    showPlaylists !== privacySettings.showPlaylists ||
    (bio.trim() || '') !== (privacySettings.bio || '')
  );

  const handleSavePrivacy = () => {
    updatePrivacy({
      isPublicProfile,
      showTopTracks,
      showTopArtists,
      showTopAlbums,
      showPlaylists,
      bio: bio.trim() || null,
    });
  };

  const handleNameSave = () => {
    if (name.trim() === user?.name) {
      setIsEditingName(false);
      return;
    }

    updateProfile(
      { name: name.trim() || undefined },
      {
        onSuccess: (updatedUser) => {
          updateUser({ name: updatedUser.name });
          setIsEditingName(false);
        },
      }
    );
  };

  const handleNameCancel = () => {
    setName(user?.name || '');
    setIsEditingName(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validations
    if (!currentPassword || !newPassword || !confirmPassword) {
      setValidationError('Todos los campos son obligatorios');
      return;
    }

    if (newPassword.length < 8) {
      setValidationError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Las contraseñas no coinciden');
      return;
    }

    if (currentPassword === newPassword) {
      setValidationError('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    // Submit
    changePassword(
      {
        currentPassword,
        newPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
      }
    );
  };

  return (
    <div className={styles.profilePage}>
      <Sidebar />

      <main className={styles.profilePage__main}>
        <Header showBackButton disableSearch />

        <div
          className={styles.profilePage__content}
          style={{
            background: `linear-gradient(180deg,
              rgba(${dominantColor}, 0.35) 0%,
              rgba(${dominantColor}, 0.15) 20%,
              transparent 50%)`
          }}
        >
          <div className={styles.profilePage__contentInner}>
          {/* Header with Avatar */}
          <div className={styles.profilePage__header}>
            <div
              className={styles.profilePage__avatarContainer}
              onClick={avatarModal.open}
            >
              {user?.hasAvatar ? (
                <img
                  key={`avatar-${avatarTimestamp}`}
                  src={getUserAvatarUrl(user?.id, user?.hasAvatar, avatarTimestamp)}
                  alt={user?.name || user?.username}
                  className={styles.profilePage__avatar}
                  onError={handleAvatarError}
                />
              ) : (
                <div className={styles.profilePage__avatarPlaceholder}>
                  {getUserInitials(user?.name, user?.username)}
                </div>
              )}
              <div className={styles.profilePage__avatarOverlay}>
                <span>Editar foto</span>
              </div>
            </div>
            <div>
              <h1>Perfil</h1>
              <p className={styles.profilePage__subtitle}>{user?.name || user?.username}</p>
            </div>
          </div>

          {/* Account Info Card */}
          <div className={styles.profilePage__card}>
            <div className={styles.profilePage__cardHeader}>
              <h2>Información de la cuenta</h2>
            </div>

            <div className={styles.profilePage__cardBody}>
              {/* Username */}
              <div className={styles.profilePage__field}>
                <label className={styles.profilePage__fieldLabel}>Nombre de usuario</label>
                <div className={styles.profilePage__fieldValue}>
                  <User size={18} className={styles.profilePage__fieldIcon} />
                  <span>{user?.username}</span>
                  <span className={styles.profilePage__fieldNote}>Para iniciar sesión, no se puede cambiar</span>
                </div>
              </div>

              {/* Name - Editable */}
              <div className={styles.profilePage__field}>
                <label className={styles.profilePage__fieldLabel}>Nombre para mostrar</label>
                {isEditingName ? (
                  <div className={styles.profilePage__fieldEdit}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={styles.profilePage__input}
                      placeholder="Tu nombre"
                      disabled={isUpdatingProfile}
                      autoFocus
                    />
                    <div className={styles.profilePage__fieldActions}>
                      <button
                        onClick={handleNameSave}
                        className={styles.profilePage__btnIcon_save}
                        disabled={isUpdatingProfile}
                        title="Guardar"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={handleNameCancel}
                        className={styles.profilePage__btnIcon_cancel}
                        disabled={isUpdatingProfile}
                        title="Cancelar"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.profilePage__fieldValue}>
                      <User size={18} className={styles.profilePage__fieldIcon} />
                      <span>{user?.name || 'Sin nombre'}</span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className={styles.profilePage__btnEdit}
                      >
                        Editar
                      </button>
                    </div>
                    <p className={styles.profilePage__fieldHelper}>
                      Opcional - Este es el nombre con el que aparecerás para otros usuarios
                    </p>
                  </>
                )}
                {profileSuccess && !isEditingName && (
                  <p className={styles.profilePage__successSmall}>✓ Nombre actualizado</p>
                )}
              </div>

              {/* Role */}
              <div className={styles.profilePage__field}>
                <label className={styles.profilePage__fieldLabel}>Rol</label>
                <div className={styles.profilePage__fieldValue}>
                  <span className={user?.isAdmin ? styles.profilePage__badge_admin : styles.profilePage__badge_user}>
                    {user?.isAdmin ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>

              {/* Member since */}
              <div className={styles.profilePage__field}>
                <label className={styles.profilePage__fieldLabel}>Miembro desde</label>
                <div className={styles.profilePage__fieldValue}>
                  <Calendar size={18} className={styles.profilePage__fieldIcon} />
                  <span>{formatDate(user?.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Public Profile Card */}
          <div className={styles.profilePage__card}>
            <div className={styles.profilePage__cardHeader}>
              <h2>
                <Eye size={20} />
                Perfil Público
              </h2>
            </div>

            <div className={styles.profilePage__cardBody}>
              {isLoadingPrivacy ? (
                <div className={styles.profilePage__loading}>Cargando...</div>
              ) : (
                <>
                  {/* Public Profile Toggle */}
                  <ToggleSwitch
                    label="Perfil público"
                    description="Permite que otros usuarios vean tu perfil y estadísticas de escucha"
                    checked={isPublicProfile}
                    onChange={setIsPublicProfile}
                  />

                  {/* Conditional settings when profile is public */}
                  {isPublicProfile && (
                    <>
                      <ToggleSwitch
                        label="Mostrar top canciones"
                        description="Muestra tus canciones más escuchadas en tu perfil"
                        checked={showTopTracks}
                        onChange={setShowTopTracks}
                      />

                      <ToggleSwitch
                        label="Mostrar top artistas"
                        description="Muestra tus artistas más escuchados en tu perfil"
                        checked={showTopArtists}
                        onChange={setShowTopArtists}
                      />

                      <ToggleSwitch
                        label="Mostrar top álbumes"
                        description="Muestra tus álbumes más escuchados en tu perfil"
                        checked={showTopAlbums}
                        onChange={setShowTopAlbums}
                      />

                      <ToggleSwitch
                        label="Mostrar playlists públicas"
                        description="Muestra tus playlists marcadas como públicas en tu perfil"
                        checked={showPlaylists}
                        onChange={setShowPlaylists}
                      />

                      {/* Bio */}
                      <div className={styles.profilePage__toggleItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div className={styles.profilePage__toggleInfo}>
                          <span className={styles.profilePage__toggleLabel}>Biografía</span>
                          <p className={styles.profilePage__toggleDescription}>
                            Cuéntales a otros usuarios sobre tus gustos musicales
                          </p>
                        </div>
                        <textarea
                          className={styles.profilePage__textarea}
                          value={bio}
                          onChange={(e) => setBio(e.target.value.slice(0, 500))}
                          placeholder="Escribe algo sobre ti..."
                          maxLength={500}
                        />
                        <div className={styles.profilePage__charCount}>
                          {bio.length}/500
                        </div>
                      </div>
                    </>
                  )}

                  {/* Save button and success message */}
                  {hasPrivacyChanges && (
                    <button
                      className={styles.profilePage__submitButton}
                      onClick={handleSavePrivacy}
                      disabled={isSavingPrivacy}
                    >
                      {isSavingPrivacy ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  )}

                  {privacySuccess && !hasPrivacyChanges && (
                    <div className={styles.profilePage__alert_success}>
                      <Check size={18} />
                      Configuración guardada
                    </div>
                  )}

                  {/* Preview link */}
                  {isPublicProfile && user && (
                    <Link href={`/user/${user.id}`} className={styles.profilePage__previewLink}>
                      <ExternalLink size={16} />
                      Ver mi perfil público
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Security Card - Change Password */}
          <div className={styles.profilePage__card}>
            <div className={styles.profilePage__cardHeader}>
              <h2>
                <Lock size={20} />
                Seguridad
              </h2>
            </div>

            <div className={styles.profilePage__cardBody}>
              <form onSubmit={handlePasswordSubmit} className={styles.profilePage__form}>
                <p className={styles.profilePage__formDescription}>
                  Cambia tu contraseña regularmente para mantener tu cuenta segura
                </p>

                <div className={styles.profilePage__formGrid}>
                  <div className={styles.profilePage__formGroup}>
                    <label htmlFor="currentPassword">Contraseña actual</label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={styles.profilePage__input}
                      placeholder="••••••••"
                      disabled={isPendingPassword}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className={styles.profilePage__formGroup}>
                    <label htmlFor="newPassword">Nueva contraseña</label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={styles.profilePage__input}
                      placeholder="Mínimo 8 caracteres"
                      disabled={isPendingPassword}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className={styles.profilePage__formGroup}>
                    <label htmlFor="confirmPassword">Confirmar contraseña</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={styles.profilePage__input}
                      placeholder="Repite la nueva contraseña"
                      disabled={isPendingPassword}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* Messages */}
                {validationError && (
                  <div className={styles.profilePage__alert_error}>
                    {validationError}
                  </div>
                )}

                {passwordError && (
                  <div className={styles.profilePage__alert_error}>
                    {passwordErrorObj instanceof Error ? passwordErrorObj.message : 'Error al cambiar la contraseña. Verifica que la contraseña actual sea correcta.'}
                  </div>
                )}

                {passwordSuccess && (
                  <div className={styles.profilePage__alert_success}>
                    <Check size={18} />
                    Contraseña cambiada exitosamente
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.profilePage__submitButton}
                  disabled={isPendingPassword}
                >
                  {isPendingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
                </button>
              </form>
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* Avatar Edit Modal */}
      {avatarModal.isOpen && (
        <AvatarEditModal onClose={avatarModal.close} />
      )}
    </div>
  );
}
