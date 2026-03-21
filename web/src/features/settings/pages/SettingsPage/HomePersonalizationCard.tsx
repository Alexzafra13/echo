import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, ChevronUp, ChevronDown, GripVertical, Check } from 'lucide-react';
import { Switch } from '@shared/components/ui';
import { useHomePreferences, useUpdateHomePreferences } from '../../hooks';
import type { HomeSectionConfig, HomeSectionId } from '../../services';
import styles from './SettingsPage.module.css';

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

export function HomePersonalizationCard() {
  const { data: homePreferences, isLoading } = useHomePreferences();
  const { mutate: updateHome, isPending: isSaving, isSuccess } = useUpdateHomePreferences();

  const [sections, setSections] = useState<HomeSectionConfig[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 3000);
    }
    return () => { if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current); };
  }, [isSuccess]);

  useEffect(() => {
    if (homePreferences?.homeSections) {
      setSections([...homePreferences.homeSections].sort((a, b) => a.order - b.order));
    }
  }, [homePreferences]);

  const toggleSection = useCallback((id: HomeSectionId) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }, []);

  const moveSection = useCallback((id: HomeSectionId, direction: 'up' | 'down') => {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const hasChanges =
    homePreferences?.homeSections &&
    JSON.stringify(sections) !==
      JSON.stringify([...homePreferences.homeSections].sort((a, b) => a.order - b.order));

  if (isLoading) {
    return <div className={styles.settingsPage__loading}>Cargando...</div>;
  }

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2><Home size={20} /> Personalizar Inicio</h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        <p className={styles.settingsPage__cardDescription}>
          Elige qué secciones mostrar en tu página de inicio y en qué orden. El Hero siempre se muestra primero.
        </p>
        <div className={styles.settingsPage__sectionsList}>
          {sections.map((section, index) => (
            <div key={section.id} className={styles.settingsPage__sectionItem}>
              <div className={styles.settingsPage__sectionHandle}><GripVertical size={16} /></div>
              <div className={styles.settingsPage__sectionInfo}>
                <span className={styles.settingsPage__sectionLabel}>
                  {SECTION_LABELS[section.id] || section.id}
                </span>
              </div>
              <div className={styles.settingsPage__sectionActions}>
                <button type="button" className={styles.settingsPage__moveButton} onClick={() => moveSection(section.id, 'up')} disabled={index === 0} aria-label="Mover arriba">
                  <ChevronUp size={18} />
                </button>
                <button type="button" className={styles.settingsPage__moveButton} onClick={() => moveSection(section.id, 'down')} disabled={index === sections.length - 1} aria-label="Mover abajo">
                  <ChevronDown size={18} />
                </button>
                <Switch checked={section.enabled} onChange={() => toggleSection(section.id)} aria-label={`Activar ${SECTION_LABELS[section.id] || section.id}`} />
              </div>
            </div>
          ))}
        </div>
        {hasChanges && (
          <button className={styles.settingsPage__saveButton} onClick={() => updateHome({ homeSections: sections })} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        )}
        {showSuccess && !hasChanges && (
          <div className={styles.settingsPage__success}><Check size={18} /> Configuración guardada</div>
        )}
      </div>
    </div>
  );
}
