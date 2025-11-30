import { useState, useEffect } from 'react';
import { Settings, Eye, Lock, Palette, Globe, Check, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useAuth } from '@shared/hooks';
import { usePrivacySettings, useUpdatePrivacySettings } from '../../hooks';
import styles from './SettingsPage.module.css';

/**
 * SettingsPage Component
 * User settings page with privacy, appearance, and language options
 */
export function SettingsPage() {
  const { user } = useAuth();
  const { data: privacySettings, isLoading } = usePrivacySettings();
  const { mutate: updatePrivacy, isPending: isSaving, isSuccess } = useUpdatePrivacySettings();

  // Local state for form
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [showTopTracks, setShowTopTracks] = useState(true);
  const [showTopArtists, setShowTopArtists] = useState(true);
  const [showTopAlbums, setShowTopAlbums] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [bio, setBio] = useState('');

  // Sync with server data
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

  const hasChanges = privacySettings && (
    isPublicProfile !== privacySettings.isPublicProfile ||
    showTopTracks !== privacySettings.showTopTracks ||
    showTopArtists !== privacySettings.showTopArtists ||
    showTopAlbums !== privacySettings.showTopAlbums ||
    showPlaylists !== privacySettings.showPlaylists ||
    (bio.trim() || '') !== (privacySettings.bio || '')
  );

  return (
    <div className={styles.settingsPage}>
      <Sidebar />

      <main className={styles.settingsPage__main}>
        <Header showBackButton disableSearch />

        <div className={styles.settingsPage__content}>
          <div className={styles.settingsPage__contentInner}>
          {/* Header */}
          <div className={styles.settingsPage__header}>
            <div className={styles.settingsPage__headerIcon}>
              <Settings size={28} />
            </div>
            <div>
              <h1>Configuración</h1>
              <p className={styles.settingsPage__subtitle}>Personaliza tu experiencia</p>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.settingsPage__loading}>Cargando...</div>
          ) : (
            <>
              {/* Privacy Settings Card */}
              <div className={styles.settingsPage__card}>
                <div className={styles.settingsPage__cardHeader}>
                  <h2>
                    <Eye size={20} />
                    Perfil Público
                  </h2>
                </div>

                <div className={styles.settingsPage__cardBody}>
                  {/* Public Profile Toggle */}
                  <div className={styles.settingsPage__toggleItem}>
                    <div className={styles.settingsPage__toggleInfo}>
                      <span className={styles.settingsPage__toggleLabel}>Perfil público</span>
                      <p className={styles.settingsPage__toggleDescription}>
                        Permite que otros usuarios vean tu perfil y estadísticas de escucha
                      </p>
                    </div>
                    <label className={styles.settingsPage__toggle}>
                      <input
                        type="checkbox"
                        className={styles.settingsPage__toggleInput}
                        checked={isPublicProfile}
                        onChange={(e) => setIsPublicProfile(e.target.checked)}
                      />
                      <span className={styles.settingsPage__toggleSlider}></span>
                    </label>
                  </div>

                  {/* Conditional settings when profile is public */}
                  {isPublicProfile && (
                    <>
                      <div className={styles.settingsPage__toggleItem}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Mostrar top canciones</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            Muestra tus canciones más escuchadas en tu perfil
                          </p>
                        </div>
                        <label className={styles.settingsPage__toggle}>
                          <input
                            type="checkbox"
                            className={styles.settingsPage__toggleInput}
                            checked={showTopTracks}
                            onChange={(e) => setShowTopTracks(e.target.checked)}
                          />
                          <span className={styles.settingsPage__toggleSlider}></span>
                        </label>
                      </div>

                      <div className={styles.settingsPage__toggleItem}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Mostrar top artistas</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            Muestra tus artistas más escuchados en tu perfil
                          </p>
                        </div>
                        <label className={styles.settingsPage__toggle}>
                          <input
                            type="checkbox"
                            className={styles.settingsPage__toggleInput}
                            checked={showTopArtists}
                            onChange={(e) => setShowTopArtists(e.target.checked)}
                          />
                          <span className={styles.settingsPage__toggleSlider}></span>
                        </label>
                      </div>

                      <div className={styles.settingsPage__toggleItem}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Mostrar top álbumes</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            Muestra tus álbumes más escuchados en tu perfil
                          </p>
                        </div>
                        <label className={styles.settingsPage__toggle}>
                          <input
                            type="checkbox"
                            className={styles.settingsPage__toggleInput}
                            checked={showTopAlbums}
                            onChange={(e) => setShowTopAlbums(e.target.checked)}
                          />
                          <span className={styles.settingsPage__toggleSlider}></span>
                        </label>
                      </div>

                      <div className={styles.settingsPage__toggleItem}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Mostrar playlists públicas</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            Muestra tus playlists marcadas como públicas en tu perfil
                          </p>
                        </div>
                        <label className={styles.settingsPage__toggle}>
                          <input
                            type="checkbox"
                            className={styles.settingsPage__toggleInput}
                            checked={showPlaylists}
                            onChange={(e) => setShowPlaylists(e.target.checked)}
                          />
                          <span className={styles.settingsPage__toggleSlider}></span>
                        </label>
                      </div>

                      {/* Bio */}
                      <div className={styles.settingsPage__toggleItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Biografía</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            Cuéntales a otros usuarios sobre tus gustos musicales
                          </p>
                        </div>
                        <textarea
                          className={styles.settingsPage__textarea}
                          value={bio}
                          onChange={(e) => setBio(e.target.value.slice(0, 500))}
                          placeholder="Escribe algo sobre ti..."
                          maxLength={500}
                        />
                        <div className={styles.settingsPage__charCount}>
                          {bio.length}/500
                        </div>
                      </div>
                    </>
                  )}

                  {/* Save button and success message */}
                  {hasChanges && (
                    <button
                      className={styles.settingsPage__saveButton}
                      onClick={handleSavePrivacy}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  )}

                  {isSuccess && !hasChanges && (
                    <div className={styles.settingsPage__success}>
                      <Check size={18} />
                      Configuración guardada
                    </div>
                  )}

                  {/* Preview link */}
                  {isPublicProfile && user && (
                    <Link href={`/user/${user.id}`} className={styles.settingsPage__previewLink}>
                      <ExternalLink size={16} />
                      Ver mi perfil público
                    </Link>
                  )}
                </div>
              </div>

              {/* Account Security Card */}
              <div className={styles.settingsPage__card}>
                <div className={styles.settingsPage__cardHeader}>
                  <h2>
                    <Lock size={20} />
                    Cuenta y Seguridad
                  </h2>
                </div>

                <div className={styles.settingsPage__cardBody}>
                  <div className={styles.settingsPage__toggleItem}>
                    <div className={styles.settingsPage__toggleInfo}>
                      <span className={styles.settingsPage__toggleLabel}>Cambiar contraseña</span>
                      <p className={styles.settingsPage__toggleDescription}>
                        Actualiza tu contraseña para mantener tu cuenta segura
                      </p>
                    </div>
                    <Link href="/profile" className={styles.settingsPage__previewLink} style={{ marginTop: 0 }}>
                      Ir a perfil
                    </Link>
                  </div>
                </div>
              </div>

              {/* Appearance Card - Placeholder for future */}
              <div className={styles.settingsPage__card}>
                <div className={styles.settingsPage__cardHeader}>
                  <h2>
                    <Palette size={20} />
                    Apariencia
                  </h2>
                </div>

                <div className={styles.settingsPage__cardBody}>
                  <div className={styles.settingsPage__toggleItem}>
                    <div className={styles.settingsPage__toggleInfo}>
                      <span className={styles.settingsPage__toggleLabel}>Tema</span>
                      <p className={styles.settingsPage__toggleDescription}>
                        El tema se configura automáticamente según las preferencias del sistema
                      </p>
                    </div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
                      Oscuro
                    </span>
                  </div>
                </div>
              </div>

              {/* Language Card - Placeholder for future */}
              <div className={styles.settingsPage__card}>
                <div className={styles.settingsPage__cardHeader}>
                  <h2>
                    <Globe size={20} />
                    Idioma
                  </h2>
                </div>

                <div className={styles.settingsPage__cardBody}>
                  <div className={styles.settingsPage__toggleItem}>
                    <div className={styles.settingsPage__toggleInfo}>
                      <span className={styles.settingsPage__toggleLabel}>Idioma de la interfaz</span>
                      <p className={styles.settingsPage__toggleDescription}>
                        Selecciona el idioma en el que deseas ver la aplicación
                      </p>
                    </div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
                      Español
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
