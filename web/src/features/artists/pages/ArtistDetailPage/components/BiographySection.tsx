import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import styles from '../ArtistDetailPage.module.css';

interface BiographySectionProps {
  biography: string | null | undefined;
  biographySource: string | null | undefined;
}

/**
 * Formats biography text with a drop cap (large first letter)
 */
function formatBiographyWithDropCap(text: string) {
  if (!text || text.length === 0) return text;
  const firstChar = text.charAt(0);
  const restOfText = text.slice(1);
  return (
    <>
      <span className={styles.artistDetailPage__dropCap}>{firstChar}</span>
      {restOfText}
    </>
  );
}

/**
 * Gets the human-readable source name
 */
function getSourceName(source: string): string {
  switch (source) {
    case 'wikipedia':
      return 'Wikipedia';
    case 'lastfm':
      return 'Last.fm';
    default:
      return source;
  }
}

/**
 * BiographySection - Displays the artist's biography with expand/collapse
 */
export function BiographySection({
  biography,
  biographySource,
}: BiographySectionProps) {
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const hasBiography = biography && biography.length > 0;
  const isLongBiography = hasBiography && biography.length > 500;

  return (
    <section className={styles.artistDetailPage__biography}>
      <div className={styles.artistDetailPage__biographyHeader}>
        <BookOpen size={24} className={styles.artistDetailPage__biographyIcon} />
        <h2 className={styles.artistDetailPage__sectionTitle}>Biografía</h2>
      </div>

      {hasBiography ? (
        <div className={styles.artistDetailPage__biographyContent}>
          <div className={`${styles.artistDetailPage__biographyText} ${
            !isBioExpanded && isLongBiography ? styles.artistDetailPage__biographyText__collapsed : ''
          }`}>
            {formatBiographyWithDropCap(biography)}
          </div>

          {isLongBiography && (
            <button
              className={styles.artistDetailPage__biographyToggle}
              onClick={() => setIsBioExpanded(!isBioExpanded)}
            >
              {isBioExpanded ? 'Leer menos' : 'Leer más'}
            </button>
          )}

          {biographySource && (
            <div className={styles.artistDetailPage__biographySource}>
              Fuente: {getSourceName(biographySource)}
            </div>
          )}
        </div>
      ) : (
        <p className={styles.artistDetailPage__biographyPlaceholder}>
          No hay biografía disponible para este artista.
        </p>
      )}
    </section>
  );
}
