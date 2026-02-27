import { useState } from 'react';
import { Waves } from 'lucide-react';
import styles from './PlaylistCover.module.css';

interface PlaylistCoverProps {
  type: 'wave-mix' | 'artist' | 'genre' | 'mood';
  name: string;
  coverColor?: string;
  coverImageUrl?: string;
  artistName?: string; // For artist playlists
  size?: 'small' | 'medium' | 'large' | 'responsive';
  className?: string;
}

/**
 * Genres that have custom overlay images
 * Image files: /images/wave_mix_covers/wave_mix_{genre}.png
 */
const GENRES_WITH_OVERLAY = ['rock'] as const;

/**
 * Apple Music-inspired gradient backgrounds for genre covers.
 * Each genre gets a unique, vibrant gradient.
 */
const GENRE_GRADIENTS: Record<string, string> = {
  // Rock & derivatives
  'rock': 'linear-gradient(150deg, #1a1a2e 0%, #2d4263 55%, #4a6fa5 100%)',
  'alternative': 'linear-gradient(150deg, #004d40 0%, #00796b 50%, #26a69a 100%)',
  'indie': 'linear-gradient(150deg, #1b5e20 0%, #2e7d32 50%, #4caf50 100%)',
  'metal': 'linear-gradient(150deg, #1a1a1a 0%, #37474f 50%, #546e7a 100%)',
  'punk': 'linear-gradient(150deg, #b71c1c 0%, #d32f2f 50%, #e57373 100%)',
  'grunge': 'linear-gradient(150deg, #263238 0%, #455a64 50%, #78909c 100%)',
  'post-punk': 'linear-gradient(150deg, #1a237e 0%, #283593 50%, #5c6bc0 100%)',
  'shoegaze': 'linear-gradient(150deg, #4a148c 0%, #6a1b9a 50%, #ab47bc 100%)',
  'garage': 'linear-gradient(150deg, #4e342e 0%, #795548 50%, #a1887f 100%)',
  'psychedelic': 'linear-gradient(150deg, #880e4f 0%, #ad1457 50%, #ec407a 100%)',
  'progressive': 'linear-gradient(150deg, #1a237e 0%, #303f9f 50%, #7986cb 100%)',
  'hardcore': 'linear-gradient(150deg, #b71c1c 0%, #c62828 50%, #e53935 100%)',
  'emo': 'linear-gradient(150deg, #1a1a2e 0%, #4a148c 50%, #7c4dff 100%)',
  'stoner': 'linear-gradient(150deg, #33691e 0%, #558b2f 50%, #9e9d24 100%)',
  'doom': 'linear-gradient(150deg, #1a1a1a 0%, #311b92 50%, #4527a0 100%)',
  'noise': 'linear-gradient(150deg, #263238 0%, #37474f 50%, #607d8b 100%)',
  'britpop': 'linear-gradient(150deg, #0d47a1 0%, #1565c0 50%, #e53935 100%)',
  'hard rock': 'linear-gradient(150deg, #bf360c 0%, #e64a19 50%, #ff5722 100%)',
  'soft rock': 'linear-gradient(150deg, #1565c0 0%, #42a5f5 50%, #90caf9 100%)',
  // Pop & mainstream
  'pop': 'linear-gradient(150deg, #c2185b 0%, #e91e63 50%, #f06292 100%)',
  'synthpop': 'linear-gradient(150deg, #4a148c 0%, #8e24aa 50%, #ce93d8 100%)',
  'dream pop': 'linear-gradient(150deg, #6a1b9a 0%, #9c27b0 50%, #e1bee7 100%)',
  'synth': 'linear-gradient(150deg, #0d47a1 0%, #7b1fa2 50%, #e040fb 100%)',
  'new wave': 'linear-gradient(150deg, #00695c 0%, #00897b 50%, #e91e63 100%)',
  'power pop': 'linear-gradient(150deg, #d32f2f 0%, #f44336 50%, #ff8a80 100%)',
  // Electronic & dance
  'electronic': 'linear-gradient(150deg, #0d47a1 0%, #1565c0 50%, #42a5f5 100%)',
  'dance': 'linear-gradient(150deg, #880e4f 0%, #c2185b 50%, #f06292 100%)',
  'techno': 'linear-gradient(150deg, #1a1a2e 0%, #0d47a1 50%, #1565c0 100%)',
  'house': 'linear-gradient(150deg, #4a148c 0%, #7b1fa2 50%, #e040fb 100%)',
  'trance': 'linear-gradient(150deg, #01579b 0%, #0288d1 50%, #4fc3f7 100%)',
  'ambient': 'linear-gradient(150deg, #004d40 0%, #00695c 50%, #80cbc4 100%)',
  'drum and bass': 'linear-gradient(150deg, #1a237e 0%, #1565c0 50%, #29b6f6 100%)',
  'dubstep': 'linear-gradient(150deg, #311b92 0%, #4527a0 50%, #7c4dff 100%)',
  'downtempo': 'linear-gradient(150deg, #1b5e20 0%, #2e7d32 50%, #81c784 100%)',
  'edm': 'linear-gradient(150deg, #e91e63 0%, #9c27b0 50%, #3f51b5 100%)',
  'idm': 'linear-gradient(150deg, #263238 0%, #455a64 50%, #78909c 100%)',
  'breakbeat': 'linear-gradient(150deg, #e65100 0%, #f57c00 50%, #ffa726 100%)',
  'trip-hop': 'linear-gradient(150deg, #37474f 0%, #546e7a 50%, #90a4ae 100%)',
  'industrial': 'linear-gradient(150deg, #212121 0%, #424242 50%, #757575 100%)',
  // Hip-hop & urban
  'hip hop': 'linear-gradient(150deg, #37474f 0%, #546e7a 50%, #90a4ae 100%)',
  'hip-hop': 'linear-gradient(150deg, #37474f 0%, #546e7a 50%, #90a4ae 100%)',
  'rap': 'linear-gradient(150deg, #212121 0%, #424242 50%, #616161 100%)',
  'trap': 'linear-gradient(150deg, #880e4f 0%, #ad1457 50%, #f06292 100%)',
  'r&b': 'linear-gradient(150deg, #311b92 0%, #512da8 50%, #9575cd 100%)',
  'soul': 'linear-gradient(150deg, #4e342e 0%, #6d4c41 50%, #a1887f 100%)',
  'funk': 'linear-gradient(150deg, #e65100 0%, #ff9800 50%, #ffcc02 100%)',
  'neo-soul': 'linear-gradient(150deg, #4e342e 0%, #795548 50%, #d4e157 100%)',
  // Jazz & blues
  'jazz': 'linear-gradient(150deg, #bf360c 0%, #e64a19 50%, #ff8a65 100%)',
  'blues': 'linear-gradient(150deg, #0d47a1 0%, #1976d2 50%, #64b5f6 100%)',
  'bossa nova': 'linear-gradient(150deg, #00695c 0%, #00897b 50%, #4db6ac 100%)',
  'swing': 'linear-gradient(150deg, #bf360c 0%, #e64a19 50%, #ffab40 100%)',
  // Classical & orchestral
  'classical': 'linear-gradient(150deg, #4a148c 0%, #7b1fa2 50%, #ba68c8 100%)',
  'opera': 'linear-gradient(150deg, #b71c1c 0%, #c62828 50%, #e57373 100%)',
  'soundtrack': 'linear-gradient(150deg, #1a237e 0%, #283593 50%, #7986cb 100%)',
  'orchestral': 'linear-gradient(150deg, #311b92 0%, #4527a0 50%, #9575cd 100%)',
  // Folk & acoustic
  'folk': 'linear-gradient(150deg, #33691e 0%, #558b2f 50%, #8bc34a 100%)',
  'country': 'linear-gradient(150deg, #e65100 0%, #f57c00 50%, #ffb74d 100%)',
  'acoustic': 'linear-gradient(150deg, #5d4037 0%, #795548 50%, #a1887f 100%)',
  'singer-songwriter': 'linear-gradient(150deg, #4e342e 0%, #6d4c41 50%, #bcaaa4 100%)',
  'americana': 'linear-gradient(150deg, #bf360c 0%, #d84315 50%, #ff8a65 100%)',
  'bluegrass': 'linear-gradient(150deg, #33691e 0%, #689f38 50%, #aed581 100%)',
  'celtic': 'linear-gradient(150deg, #1b5e20 0%, #388e3c 50%, #81c784 100%)',
  // Latin & world
  'reggaeton': 'linear-gradient(150deg, #00695c 0%, #00897b 50%, #4db6ac 100%)',
  'latin': 'linear-gradient(150deg, #c62828 0%, #ef5350 50%, #ff8a80 100%)',
  'salsa': 'linear-gradient(150deg, #c62828 0%, #e53935 50%, #ff5252 100%)',
  'reggae': 'linear-gradient(150deg, #1b5e20 0%, #388e3c 50%, #66bb6a 100%)',
  'flamenco': 'linear-gradient(150deg, #bf360c 0%, #e64a19 50%, #ff7043 100%)',
  'bossa': 'linear-gradient(150deg, #00695c 0%, #26a69a 50%, #80cbc4 100%)',
  'afrobeat': 'linear-gradient(150deg, #e65100 0%, #f57c00 50%, #ffc107 100%)',
  'dancehall': 'linear-gradient(150deg, #1b5e20 0%, #fdd835 50%, #d32f2f 100%)',
  'cumbia': 'linear-gradient(150deg, #c62828 0%, #e65100 50%, #ffa726 100%)',
  'bachata': 'linear-gradient(150deg, #880e4f 0%, #c2185b 50%, #f48fb1 100%)',
  'samba': 'linear-gradient(150deg, #1b5e20 0%, #fdd835 50%, #1565c0 100%)',
  // Other
  'disco': 'linear-gradient(150deg, #e91e63 0%, #9c27b0 50%, #ffc107 100%)',
  'ska': 'linear-gradient(150deg, #1a1a1a 0%, #f5f5f5 50%, #1a1a1a 100%)',
  'gospel': 'linear-gradient(150deg, #4a148c 0%, #7b1fa2 50%, #ffc107 100%)',
  'experimental': 'linear-gradient(150deg, #263238 0%, #455a64 50%, #e91e63 100%)',
  'lo-fi': 'linear-gradient(150deg, #3e2723 0%, #5d4037 50%, #8d6e63 100%)',
  'post-rock': 'linear-gradient(150deg, #1a237e 0%, #283593 50%, #7986cb 100%)',
  'math rock': 'linear-gradient(150deg, #00695c 0%, #00897b 50%, #26a69a 100%)',
  'new age': 'linear-gradient(150deg, #004d40 0%, #00897b 50%, #a5d6a7 100%)',
  'spoken word': 'linear-gradient(150deg, #3e2723 0%, #4e342e 50%, #8d6e63 100%)',
};

/**
 * Get overlay image URL for a genre if it exists
 */
function getGenreOverlayUrl(name: string): string | null {
  // Extract genre name from playlist name (e.g., "Rock Mix" -> "rock")
  const genreName = name.replace(/ Mix$/i, '').toLowerCase();

  if (GENRES_WITH_OVERLAY.includes(genreName as typeof GENRES_WITH_OVERLAY[number])) {
    return `/images/wave_mix_covers/wave_mix_${genreName}.png`;
  }
  return null;
}

/**
 * Get the gradient for a genre based on its name.
 * Uses keyword matching for compound genre names
 * (e.g., "Alternative Rock" matches "rock", "Rock Pop" matches "pop").
 */
function getGenreGradient(displayName: string): string {
  const key = displayName.toLowerCase();

  // Exact match first
  if (GENRE_GRADIENTS[key]) return GENRE_GRADIENTS[key];

  // Keyword matching: find the first gradient key contained in the genre name
  for (const [gradientKey, gradient] of Object.entries(GENRE_GRADIENTS)) {
    if (key.includes(gradientKey)) return gradient;
  }

  // Hash-based fallback: generate a vibrant gradient from the genre name
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `linear-gradient(150deg, hsl(${hue}, 75%, 18%) 0%, hsl(${hue}, 70%, 32%) 50%, hsl(${hue}, 65%, 48%) 100%)`;
}

/**
 * Inline Echo icon (disc/vinyl from sidebar logo) used as a small badge
 */
function EchoBadge({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="555 195 305 325"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="706" cy="353" r="146" stroke="white" strokeWidth="8" />
      <circle cx="706" cy="353" r="59.5" fill="#E04D28" stroke="#E04D28" />
      <circle cx="706" cy="353" r="25" fill="#1a1a1a" />
      <path
        d="M583.029 380.431C578.101 368.222 576.47 353.779 578.339 338.557C580.208 323.335 585.508 307.899 593.709 293.817C601.91 279.735 612.711 267.526 625.009 258.423C637.307 249.318 650.645 243.657 663.661 241.976"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M827.373 321.122C832.464 333.205 834.275 347.566 832.583 362.762C830.892 377.956 825.76 393.422 817.701 407.585C809.641 421.748 798.949 434.088 786.718 443.358C774.486 452.629 761.168 458.486 748.124 460.373"
        stroke="white"
        strokeWidth="2"
      />
      <path
        opacity="0.7"
        d="M609.083 380.105C598.609 356.682 598.585 331.75 608.975 309.713C619.37 287.665 639.549 269.877 665.997 259.564"
        stroke="white"
        strokeWidth="2"
      />
      <path
        opacity="0.7"
        d="M805.564 336.372C812.936 356.448 811.485 377.154 801.471 395.195C791.449 413.249 773.396 427.645 750.142 436.008"
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * PlaylistCover Component
 * Displays a playlist cover with either a color background or an artist image
 */
export function PlaylistCover({
  type,
  name,
  coverColor,
  coverImageUrl,
  artistName,
  size = 'medium',
  className = '',
}: PlaylistCoverProps) {
  const [imageError, setImageError] = useState(false);
  const [overlayError, setOverlayError] = useState(false);

  const showImage = coverImageUrl && !imageError && type === 'artist';
  const backgroundColor = coverColor || '#6C5CE7';

  const isGenre = type === 'genre';
  const genreDisplayName = isGenre ? name.replace(/ Mix$/i, '') : '';
  const genreGradient = isGenre ? getGenreGradient(genreDisplayName) : undefined;

  // Check for genre overlay image
  const genreOverlayUrl = isGenre && !overlayError ? getGenreOverlayUrl(name) : null;

  return (
    <div className={`${styles.cover} ${styles[size]} ${className}`}>
      {showImage ? (
        <div className={styles.imageCover}>
          <img
            src={coverImageUrl}
            alt={name}
            onError={() => setImageError(true)}
            className={styles.image}
          />
          <div className={styles.imageOverlay} />
          {artistName && (
            <div className={styles.artistName}>
              {artistName}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`${styles.colorCover} ${(isGenre || type === 'artist') ? styles.genreCover : ''}`}
          style={
            genreGradient
              ? { background: genreGradient }
              : { backgroundColor }
          }
        >
          {isGenre ? (
            <>
              {genreOverlayUrl && (
                <img
                  src={genreOverlayUrl}
                  alt={name}
                  className={styles.genreOverlay}
                  onError={() => setOverlayError(true)}
                />
              )}
              <EchoBadge className={styles.logoBadge} />
              <div className={styles.genreName}>
                {genreDisplayName}
              </div>
            </>
          ) : type === 'artist' ? (
            <>
              <EchoBadge className={styles.logoBadge} />
              {artistName && (
                <div className={styles.genreName}>
                  {artistName}
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.iconContainer}>
                <Waves size={size === 'large' ? 80 : size === 'small' ? 32 : 48} />
              </div>
              {type === 'wave-mix' && (
                <div className={styles.coverText}>
                  Recomendaciones<br />Diarias
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
