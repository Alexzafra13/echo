import { useState, useEffect } from 'react';
import { User, Calendar, Check, X } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useAuth, useModal, useDominantColor, useDocumentTitle } from '@shared/hooks';
import { useAuthStore } from '@shared/store';
import { useUpdateProfile } from '../../hooks';
import { AvatarEditModal } from '../../components/AvatarEditModal';
import { getUserAvatarUrl, handleAvatarError, getUserInitials } from '@shared/utils/avatar.utils';
import { formatDate } from '@shared/utils/format';
import { PublicProfileCard } from './PublicProfileCard';
import { SecurityCard } from './SecurityCard';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  useDocumentTitle('Mi Perfil');
  const { user } = useAuth();
  const updateUser = useAuthStore((state) => state.updateUser);
  const avatarTimestamp = useAuthStore((state) => state.avatarTimestamp);

  // Color dominante del avatar para el fondo
  const avatarColorUrl =
    user?.hasAvatar && user?.id
      ? getUserAvatarUrl(user.id, user.hasAvatar, avatarTimestamp)
      : undefined;
  const dominantColor = useDominantColor(avatarColorUrl, '107, 114, 128');

  const avatarModal = useModal();

  // Edición del nombre
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const { mutate: updateProfile, isPending: isUpdatingProfile, isSuccess: profileSuccess } = useUpdateProfile();

  useEffect(() => { setName(user?.name || ''); }, [user?.name]);

  const handleNameSave = () => {
    if (name.trim() === user?.name) { setIsEditingName(false); return; }
    updateProfile(
      { name: name.trim() || undefined },
      { onSuccess: (updatedUser) => { updateUser({ name: updatedUser.name }); setIsEditingName(false); } }
    );
  };

  const handleNameCancel = () => { setName(user?.name || ''); setIsEditingName(false); };

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
              transparent 50%)`,
          }}
        >
          <div className={styles.profilePage__contentInner}>
            {/* Cabecera con avatar */}
            <div className={styles.profilePage__header}>
              <div className={styles.profilePage__avatarContainer} onClick={avatarModal.open}>
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
                <div className={styles.profilePage__avatarOverlay}><span>Editar foto</span></div>
              </div>
              <div>
                <h1>Perfil</h1>
                <p className={styles.profilePage__subtitle}>{user?.name || user?.username}</p>
              </div>
            </div>

            {/* Información de la cuenta */}
            <div className={styles.profilePage__card}>
              <div className={styles.profilePage__cardHeader}><h2>Información de la cuenta</h2></div>
              <div className={styles.profilePage__cardBody}>
                <div className={styles.profilePage__field}>
                  <label className={styles.profilePage__fieldLabel}>Nombre de usuario</label>
                  <div className={styles.profilePage__fieldValue}>
                    <User size={18} className={styles.profilePage__fieldIcon} />
                    <span>{user?.username}</span>
                    <span className={styles.profilePage__fieldNote}>Para iniciar sesión, no se puede cambiar</span>
                  </div>
                </div>

                <div className={styles.profilePage__field}>
                  <label className={styles.profilePage__fieldLabel}>Nombre para mostrar</label>
                  {isEditingName ? (
                    <div className={styles.profilePage__fieldEdit}>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={styles.profilePage__input} placeholder="Tu nombre" disabled={isUpdatingProfile} autoFocus />
                      <div className={styles.profilePage__fieldActions}>
                        <button onClick={handleNameSave} className={styles.profilePage__btnIcon_save} disabled={isUpdatingProfile} title="Guardar"><Check size={18} /></button>
                        <button onClick={handleNameCancel} className={styles.profilePage__btnIcon_cancel} disabled={isUpdatingProfile} title="Cancelar"><X size={18} /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.profilePage__fieldValue}>
                        <User size={18} className={styles.profilePage__fieldIcon} />
                        <span>{user?.name || 'Sin nombre'}</span>
                        <button onClick={() => setIsEditingName(true)} className={styles.profilePage__btnEdit}>Editar</button>
                      </div>
                      <p className={styles.profilePage__fieldHelper}>Opcional - Este es el nombre con el que aparecerás para otros usuarios</p>
                    </>
                  )}
                  {profileSuccess && !isEditingName && (
                    <p className={styles.profilePage__successSmall}>✓ Nombre actualizado</p>
                  )}
                </div>

                <div className={styles.profilePage__field}>
                  <label className={styles.profilePage__fieldLabel}>Rol</label>
                  <div className={styles.profilePage__fieldValue}>
                    <span className={user?.isAdmin ? styles.profilePage__badge_admin : styles.profilePage__badge_user}>
                      {user?.isAdmin ? 'Administrador' : 'Usuario'}
                    </span>
                  </div>
                </div>

                <div className={styles.profilePage__field}>
                  <label className={styles.profilePage__fieldLabel}>Miembro desde</label>
                  <div className={styles.profilePage__fieldValue}>
                    <Calendar size={18} className={styles.profilePage__fieldIcon} />
                    <span>{formatDate(user?.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <PublicProfileCard userId={user?.id} />
            <SecurityCard />
          </div>
        </div>
      </main>

      {avatarModal.isOpen && <AvatarEditModal onClose={avatarModal.close} />}
    </div>
  );
}
