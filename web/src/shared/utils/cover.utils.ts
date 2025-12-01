/**
 * Cover Art Utilities
 *
 * Helpers para manejar URLs de cover art con fallbacks
 */

/**
 * Ruta de la imagen placeholder por defecto
 * Ubicada en: web/public/images/empy_cover/empy_cover_default.png
 */
const DEFAULT_COVER_PLACEHOLDER = '/images/empy_cover/empy_cover_default.png';

/**
 * Obtiene la URL del cover art con fallback al placeholder
 *
 * @param coverUrl - URL del cover art del álbum (puede ser undefined/null)
 * @returns URL válida del cover o placeholder por defecto
 *
 * @example
 * ```tsx
 * const cover = getCoverUrl(album.coverImage);
 * <img src={cover} alt={album.title} />
 * ```
 *
 * Note: El backend incluye automáticamente un parámetro ?v=timestamp cuando
 * la imagen cambia, por lo que no necesitamos cache busting manual aquí.
 */
export function getCoverUrl(coverUrl?: string | null): string {
  // Si no hay cover URL o es una cadena vacía, usar placeholder
  if (!coverUrl || coverUrl.trim() === '') {
    return DEFAULT_COVER_PLACEHOLDER;
  }

  // El backend ya incluye ?v=timestamp para cache busting automático
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
