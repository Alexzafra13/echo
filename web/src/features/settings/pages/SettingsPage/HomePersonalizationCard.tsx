import { useState, useEffect, useCallback, useRef } from 'react';
import { Home, ChevronUp, ChevronDown, GripVertical, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@shared/components/ui';
import { useHomePreferences, useUpdateHomePreferences } from '../../hooks';
import type { HomeSectionConfig, HomeSectionId } from '../../services';
import styles from './SettingsPage.module.css';

export function HomePersonalizationCard() {
  const { t } = useTranslation();
  const { data: homePreferences, isLoading } = useHomePreferences();
  const { mutate: updateHome, isPending: isSaving, isSuccess } = useUpdateHomePreferences();

  const SECTION_LABELS: Record<HomeSectionId, string> = {
    'recent-albums': t('settings.homePersonalization.recentAlbums'),
    'artist-mix': t('settings.homePersonalization.artistMix'),
    'genre-mix': t('settings.homePersonalization.genreMix'),
    'recently-played': t('settings.homePersonalization.recentlyPlayed'),
    'my-playlists': t('settings.homePersonalization.myPlaylists'),
    'top-played': t('settings.homePersonalization.topPlayed'),
    'favorite-radios': t('settings.homePersonalization.favoriteRadios'),
    'surprise-me': t('settings.homePersonalization.surpriseMe'),
    'shared-albums': t('settings.homePersonalization.sharedLibraries'),
  };

  const [sections, setSections] = useState<HomeSectionConfig[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setShowSuccess(false), 3000);
    }
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, [isSuccess]);

  useEffect(() => {
    if (homePreferences?.homeSections) {
      setSections([...homePreferences.homeSections].sort((a, b) => a.order - b.order));
    }
  }, [homePreferences]);

  const toggleSection = useCallback((id: HomeSectionId) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
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
    return (
      <div className={styles.settingsPage__loading}>
        {t('settings.homePersonalization.loading')}
      </div>
    );
  }

  return (
    <div className={styles.settingsPage__card}>
      <div className={styles.settingsPage__cardHeader}>
        <h2>
          <Home size={20} /> {t('settings.homePersonalization.title')}
        </h2>
      </div>
      <div className={styles.settingsPage__cardBody}>
        <p className={styles.settingsPage__cardDescription}>
          {t('settings.homePersonalization.description')}
        </p>
        <div className={styles.settingsPage__sectionsList}>
          {sections.map((section, index) => (
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
                  aria-label={t('settings.homePersonalization.moveUp')}
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  type="button"
                  className={styles.settingsPage__moveButton}
                  onClick={() => moveSection(section.id, 'down')}
                  disabled={index === sections.length - 1}
                  aria-label={t('settings.homePersonalization.moveDown')}
                >
                  <ChevronDown size={18} />
                </button>
                <Switch
                  checked={section.enabled}
                  onChange={() => toggleSection(section.id)}
                  aria-label={`${t('settings.homePersonalization.enableSection')} ${SECTION_LABELS[section.id] || section.id}`}
                />
              </div>
            </div>
          ))}
        </div>
        {hasChanges && (
          <button
            className={styles.settingsPage__saveButton}
            onClick={() => updateHome({ homeSections: sections })}
            disabled={isSaving}
          >
            {isSaving
              ? t('settings.homePersonalization.saving')
              : t('settings.homePersonalization.saveButton')}
          </button>
        )}
        {showSuccess && !hasChanges && (
          <div className={styles.settingsPage__success}>
            <Check size={18} /> {t('settings.homePersonalization.saved')}
          </div>
        )}
      </div>
    </div>
  );
}
