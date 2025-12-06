import { useState, useEffect, useCallback } from 'react';
import { Settings, Eye, Lock, Palette, Globe, Check, ExternalLink, Music, Volume2, Home, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { Link } from 'wouter';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { useAuth } from '@shared/hooks';
import { usePrivacySettings, useUpdatePrivacySettings, useHomePreferences, useUpdateHomePreferences } from '../../hooks';
import { usePlayer } from '@features/player';
import type { HomeSectionConfig, HomeSectionId } from '../../services';
import styles from './SettingsPage.module.css';

// Section labels for display
const SECTION_LABELS: Record<HomeSectionId, string> = {
  'recent-albums': 'Álbumes Añadidos',
  'artist-mix': 'Mix por Artista',
  'genre-mix': 'Mix por Género',
  'recently-played': 'Escuchados Recientes',
  'my-playlists': 'Mis Playlists',
  'top-played': 'Más Escuchados',
  'favorite-radios': 'Radios Favoritas',
  'surprise-me': 'Sorpréndeme',
};

/**
 * SettingsPage Component
 * User settings page with privacy, appearance, and language options
 */
export function SettingsPage() {
  const { user } = useAuth();
  const { data: privacySettings, isLoading } = usePrivacySettings();
  const { mutate: updatePrivacy, isPending: isSaving, isSuccess } = useUpdatePrivacySettings();
  const { data: homePreferences, isLoading: isLoadingHome } = useHomePreferences();
  const { mutate: updateHome, isPending: isSavingHome, isSuccess: isSuccessHome } = useUpdateHomePreferences();
  const {
    crossfade,
    setCrossfadeEnabled,
    setCrossfadeDuration,
    normalization,
    setNormalizationEnabled,
    setNormalizationTargetLufs,
    setNormalizationPreventClipping,
  } = usePlayer();

  // Local state for privacy form
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [showTopTracks, setShowTopTracks] = useState(true);
  const [showTopArtists, setShowTopArtists] = useState(true);
  const [showTopAlbums, setShowTopAlbums] = useState(true);
  const [showPlaylists, setShowPlaylists] = useState(true);
  const [bio, setBio] = useState('');

  // Local state for home sections
  const [homeSections, setHomeSections] = useState<HomeSectionConfig[]>([]);

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

  // Sync home sections with server data
  useEffect(() => {
    if (homePreferences?.homeSections) {
      // Sort by order for display
      const sorted = [...homePreferences.homeSections].sort((a, b) => a.order - b.order);
      setHomeSections(sorted);
    }
  }, [homePreferences]);

  // Home section handlers
  const toggleSection = useCallback((id: HomeSectionId) => {
    setHomeSections(prev =>
      prev.map(section =>
        section.id === id ? { ...section, enabled: !section.enabled } : section
      )
    );
  }, []);

  const moveSection = useCallback((id: HomeSectionId, direction: 'up' | 'down') => {
    setHomeSections(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const newSections = [...prev];
      // Swap positions
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      // Update order values
      return newSections.map((section, i) => ({ ...section, order: i }));
    });
  }, []);

  const handleSaveHome = useCallback(() => {
    updateHome({ homeSections });
  }, [homeSections, updateHome]);

  // Check if home sections have changed
  const hasHomeChanges = homePreferences?.homeSections && (
    JSON.stringify(homeSections) !== JSON.stringify(
      [...homePreferences.homeSections].sort((a, b) => a.order - b.order)
    )
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

          {isLoading || isLoadingHome ? (
            <div className={styles.settingsPage__loading}>Cargando...</div>
          ) : (
            <>
              {/* Home Page Personalization Card */}
              <div className={styles.settingsPage__card}>
                <div className={styles.settingsPage__cardHeader}>
                  <h2>
                    <Home size={20} />
                    Personalizar Inicio
                  </h2>
                </div>

                <div className={styles.settingsPage__cardBody}>
                  <p className={styles.settingsPage__cardDescription}>
                    Elige qué secciones mostrar en tu página de inicio y en qué orden.
                    El Hero siempre se muestra primero.
                  </p>

                  <div className={styles.settingsPage__sectionsList}>
                    {homeSections.map((section, index) => (
                      <div key={section.id} className={styles.settingsPage__sectionItem}>
                        <div className={styles.settingsPage__sectionHandle}>
                          <GripVertical size={16} />
                        </div>

                        <div className={styles.settingsPage__sectionInfo}>
                          <span className={styles.settingsPage__sectionLabel}>
                            {SECTION_LABELS[section.id]}
                          </span>
                        </div>

                        <div className={styles.settingsPage__sectionActions}>
                          <button
                            type="button"
                            className={styles.settingsPage__moveButton}
                            onClick={() => moveSection(section.id, 'up')}
                            disabled={index === 0}
                            aria-label="Mover arriba"
                          >
                            <ChevronUp size={18} />
                          </button>
                          <button
                            type="button"
                            className={styles.settingsPage__moveButton}
                            onClick={() => moveSection(section.id, 'down')}
                            disabled={index === homeSections.length - 1}
                            aria-label="Mover abajo"
                          >
                            <ChevronDown size={18} />
                          </button>
                          <label className={styles.settingsPage__toggle}>
                            <input
                              type="checkbox"
                              className={styles.settingsPage__toggleInput}
                              checked={section.enabled}
                              onChange={() => toggleSection(section.id)}
                            />
                            <span className={styles.settingsPage__toggleSlider}></span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save button and success message */}
                  {hasHomeChanges && (
                    <button
                      className={styles.settingsPage__saveButton}
                      onClick={handleSaveHome}
                      disabled={isSavingHome}
                    >
                      {isSavingHome ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  )}

                  {isSuccessHome && !hasHomeChanges && (
                    <div className={styles.settingsPage__success}>
                      <Check size={18} />
                      Configuración guardada
                    </div>
                  )}
                </div>
              </div>

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

              {/* Audio Normalization Card */}
              <div className={styles.settingsPage__card}>
                <div className={styles.settingsPage__cardHeader}>
                  <h2>
                    <Volume2 size={20} />
                    Normalización de Audio
                  </h2>
                </div>

                <div className={styles.settingsPage__cardBody}>
                  {/* Info note */}
                  <div className={styles.settingsPage__infoNote}>
                    <Music size={16} />
                    <span>
                      El análisis de volumen se realiza automáticamente al importar música.
                      El servidor detecta tu hardware y ajusta la velocidad de procesamiento.
                    </span>
                  </div>

                  {/* Normalization Toggle */}
                  <div className={styles.settingsPage__toggleItem}>
                    <div className={styles.settingsPage__toggleInfo}>
                      <span className={styles.settingsPage__toggleLabel}>Normalizar volumen</span>
                      <p className={styles.settingsPage__toggleDescription}>
                        Iguala el volumen percibido entre canciones para evitar cambios bruscos
                      </p>
                    </div>
                    <label className={styles.settingsPage__toggle}>
                      <input
                        type="checkbox"
                        className={styles.settingsPage__toggleInput}
                        checked={normalization.enabled}
                        onChange={(e) => setNormalizationEnabled(e.target.checked)}
                      />
                      <span className={styles.settingsPage__toggleSlider}></span>
                    </label>
                  </div>

                  {/* Target LUFS */}
                  {normalization.enabled && (
                    <>
                      <div className={styles.settingsPage__toggleItem}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Nivel de referencia</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            -16 LUFS (Apple Music) es más conservador, -14 LUFS (Spotify) es más fuerte
                          </p>
                        </div>
                        <select
                          className={styles.settingsPage__select}
                          value={normalization.targetLufs}
                          onChange={(e) => setNormalizationTargetLufs(Number(e.target.value) as -14 | -16)}
                        >
                          <option value={-16}>-16 LUFS (Apple)</option>
                          <option value={-14}>-14 LUFS (Spotify)</option>
                        </select>
                      </div>

                      {/* Prevent Clipping */}
                      <div className={styles.settingsPage__toggleItem}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Prevenir distorsión</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            No aumenta el volumen más allá del límite seguro para evitar distorsión
                          </p>
                        </div>
                        <label className={styles.settingsPage__toggle}>
                          <input
                            type="checkbox"
                            className={styles.settingsPage__toggleInput}
                            checked={normalization.preventClipping}
                            onChange={(e) => setNormalizationPreventClipping(e.target.checked)}
                          />
                          <span className={styles.settingsPage__toggleSlider}></span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Playback Card - Crossfade settings */}
              <div className={styles.settingsPage__card}>
                <div className={styles.settingsPage__cardHeader}>
                  <h2>
                    <Music size={20} />
                    Reproducción
                  </h2>
                </div>

                <div className={styles.settingsPage__cardBody}>
                  {/* Crossfade Toggle */}
                  <div className={styles.settingsPage__toggleItem}>
                    <div className={styles.settingsPage__toggleInfo}>
                      <span className={styles.settingsPage__toggleLabel}>Fundido entre canciones</span>
                      <p className={styles.settingsPage__toggleDescription}>
                        Transición suave entre canciones con fundido de audio (crossfade)
                      </p>
                    </div>
                    <label className={styles.settingsPage__toggle}>
                      <input
                        type="checkbox"
                        className={styles.settingsPage__toggleInput}
                        checked={crossfade.enabled}
                        onChange={(e) => setCrossfadeEnabled(e.target.checked)}
                      />
                      <span className={styles.settingsPage__toggleSlider}></span>
                    </label>
                  </div>

                  {/* Crossfade Duration */}
                  {crossfade.enabled && (
                    <div className={styles.settingsPage__toggleItem}>
                      <div className={styles.settingsPage__toggleInfo}>
                        <span className={styles.settingsPage__toggleLabel}>Duración del fundido</span>
                        <p className={styles.settingsPage__toggleDescription}>
                          Tiempo en segundos para la transición entre canciones
                        </p>
                      </div>
                      <div className={styles.settingsPage__sliderContainer}>
                        <input
                          type="range"
                          className={styles.settingsPage__slider}
                          min="1"
                          max="12"
                          step="1"
                          value={crossfade.duration}
                          onChange={(e) => setCrossfadeDuration(Number(e.target.value))}
                        />
                        <span className={styles.settingsPage__sliderValue}>{crossfade.duration}s</span>
                      </div>
                    </div>
                  )}
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
