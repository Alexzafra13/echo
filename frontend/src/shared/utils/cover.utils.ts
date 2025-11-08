/**
 * Cover Art Utilities
 *
 * Helpers para manejar URLs de cover art con fallbacks
 */

/**
 * Ruta de la imagen placeholder por defecto
 * Ubicada en: frontend/public/images/empy_cover/empy_cover_default.png
 */
const DEFAULT_COVER_PLACEHOLDER = '/images/empy_cover/empy_cover_default.png';

/**
 * Obtiene la URL del cover art con fallback al placeholder
 *
 * @param coverUrl - URL del cover art del álbum (puede ser undefined/null)
 * @param bustCache - Si es true, agrega timestamp para evitar caché (default: true si hay ?_refresh en URL)
 * @returns URL válida del cover o placeholder por defecto
 *
 * @example
 * ```tsx
 * const cover = getCoverUrl(album.coverImage);
 * <img src={cover} alt={album.title} />
 * ```
 */
export function getCoverUrl(coverUrl?: string | null, bustCache?: boolean): string {
  // Si no hay cover URL o es una cadena vacía, usar placeholder
  if (!coverUrl || coverUrl.trim() === '') {
    return DEFAULT_COVER_PLACEHOLDER;
  }

  // Auto-detect cache busting from URL params
  if (bustCache === undefined) {
    bustCache = new URLSearchParams(window.location.search).has('_refresh');
  }

  // Add cache busting parameter if needed
  if (bustCache) {
    const separator = coverUrl.includes('?') ? '&' : '?';
    const timestamp = new URLSearchParams(window.location.search).get('_refresh') || Date.now().toString();
    return `${coverUrl}${separator}_t=${timestamp}`;
  }

  return coverUrl;
}

/**
 * Handler para evento onError de imágenes
 * Cambia la imagen a placeholder si falla la carga
 *
 * @example
 * ```tsx
 * <img
 *   src={album.coverImage}
 *   onError={handleImageError}
 *   alt="Album cover"
 * />
 * ```
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;

  // Evitar loop infinito si el placeholder también falla
  if (img.src !== DEFAULT_COVER_PLACEHOLDER) {
    img.src = DEFAULT_COVER_PLACEHOLDER;
  }
}
