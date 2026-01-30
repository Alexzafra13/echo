import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Palette, Globe, Check, Music, Volume2, Home, ChevronUp, ChevronDown, GripVertical, Sun, Moon, Monitor } from 'lucide-react';
import { Header } from '@shared/components/layout/Header';
import { Sidebar } from '@features/home/components';
import { Switch } from '@shared/components/ui';
import { useTheme } from '@shared/hooks';
import { useHomePreferences, useUpdateHomePreferences } from '../../hooks';
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
  'shared-albums': 'Bibliotecas Compartidas',
};

/**
 * SettingsPage Component
 * User settings page with home customization, appearance, audio and playback options
 */
export function SettingsPage() {
  const { themePreference, setThemePreference, theme } = useTheme();
  const { data: homePreferences, isLoading: isLoadingHome } = useHomePreferences();
  const { mutate: updateHome, isPending: isSavingHome, isSuccess: isSuccessHome } = useUpdateHomePreferences();
  const {
    crossfade,
    setCrossfadeEnabled,
    setCrossfadeDuration,
    setCrossfadeSmartMode,
    normalization,
    setNormalizationEnabled,
    setNormalizationTargetLufs,
    setNormalizationPreventClipping,
    autoplay,
    setAutoplayEnabled,
  } = usePlayer();

  // Local state for home sections
  const [homeSections, setHomeSections] = useState<HomeSectionConfig[]>([]);

  // State for showing success message temporarily
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show success message temporarily when save succeeds
  useEffect(() => {
    if (isSuccessHome) {
      setShowSuccess(true);
      // Clear any existing timeout
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      // Hide after 3 seconds
      successTimeoutRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [isSuccessHome]);

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

          {isLoadingHome ? (
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
                            {SECTION_LABELS[section.id] || section.id}
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
                          <Switch
                            checked={section.enabled}
                            onChange={() => toggleSection(section.id)}
                            aria-label={`Activar ${SECTION_LABELS[section.id] || section.id}`}
                          />
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

                  {showSuccess && !hasHomeChanges && (
                    <div className={styles.settingsPage__success}>
                      <Check size={18} />
                      Configuración guardada
                    </div>
                  )}
                </div>
              </div>

              {/* Appearance Card */}
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
                        Elige cómo quieres que se vea la aplicación
                      </p>
                    </div>
                  </div>

                  {/* Theme selector buttons */}
                  <div className={styles.settingsPage__themeSelector}>
                    <button
                      type="button"
                      className={`${styles.settingsPage__themeOption} ${themePreference === 'auto' ? styles['settingsPage__themeOption--active'] : ''}`}
                      onClick={() => setThemePreference('auto')}
                    >
                      <Monitor size={20} />
                      <span className={styles.settingsPage__themeOptionLabel}>Automático</span>
                      <span className={styles.settingsPage__themeOptionDesc}>Según tu dispositivo</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.settingsPage__themeOption} ${themePreference === 'light' ? styles['settingsPage__themeOption--active'] : ''}`}
                      onClick={() => setThemePreference('light')}
                    >
                      <Sun size={20} />
                      <span className={styles.settingsPage__themeOptionLabel}>Claro</span>
                      <span className={styles.settingsPage__themeOptionDesc}>Tema claro siempre</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.settingsPage__themeOption} ${themePreference === 'dark' ? styles['settingsPage__themeOption--active'] : ''}`}
                      onClick={() => setThemePreference('dark')}
                    >
                      <Moon size={20} />
                      <span className={styles.settingsPage__themeOptionLabel}>Oscuro</span>
                      <span className={styles.settingsPage__themeOptionDesc}>Tema oscuro siempre</span>
                    </button>
                  </div>

                  {/* Current theme indicator when in auto mode */}
                  {themePreference === 'auto' && (
                    <p className={styles.settingsPage__themeNote}>
                      Actualmente usando tema {theme === 'dark' ? 'oscuro' : 'claro'} según tu dispositivo
                    </p>
                  )}
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
                    <Switch
                      checked={normalization.enabled}
                      onChange={setNormalizationEnabled}
                      aria-label="Normalizar volumen"
                    />
                  </div>

                  {/* Target LUFS */}
                  {normalization.enabled && (
                    <>
                      <div className={styles.settingsPage__toggleItem}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Nivel de referencia</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            -16 LUFS es más conservador (mejor para auriculares), -14 LUFS es más fuerte
                          </p>
                        </div>
                        <select
                          className={styles.settingsPage__select}
                          value={normalization.targetLufs}
                          onChange={(e) => setNormalizationTargetLufs(Number(e.target.value) as -14 | -16)}
                        >
                          <option value={-16}>-16 LUFS (Conservador)</option>
                          <option value={-14}>-14 LUFS (Estándar)</option>
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
                        <Switch
                          checked={normalization.preventClipping}
                          onChange={setNormalizationPreventClipping}
                          aria-label="Prevenir distorsión"
                        />
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
                    <Switch
                      checked={crossfade.enabled}
                      onChange={setCrossfadeEnabled}
                      aria-label="Fundido entre canciones"
                    />
                  </div>

                  {/* Crossfade Duration */}
                  {crossfade.enabled && (
                    <>
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

                      {/* Smart Crossfade Toggle */}
                      <div className={styles.settingsPage__toggleItem}>
                        <div className={styles.settingsPage__toggleInfo}>
                          <span className={styles.settingsPage__toggleLabel}>Fundido inteligente</span>
                          <p className={styles.settingsPage__toggleDescription}>
                            Detecta automáticamente el final natural de las canciones para iniciar la transición
                          </p>
                        </div>
                        <Switch
                          checked={crossfade.smartMode}
                          onChange={setCrossfadeSmartMode}
                          aria-label="Fundido inteligente"
                        />
                      </div>
                    </>
                  )}

                  {/* Autoplay Toggle */}
                  <div className={styles.settingsPage__toggleItem}>
                    <div className={styles.settingsPage__toggleInfo}>
                      <span className={styles.settingsPage__toggleLabel}>Reproducción automática</span>
                      <p className={styles.settingsPage__toggleDescription}>
                        Cuando termina un álbum o playlist, continúa automáticamente con artistas similares
                      </p>
                    </div>
                    <Switch
                      checked={autoplay.enabled}
                      onChange={setAutoplayEnabled}
                      aria-label="Reproducción automática"
                    />
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
