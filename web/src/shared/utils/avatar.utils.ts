/**
 * Avatar Utilities
 *
 * Helpers para manejar URLs de avatares de usuario con fallbacks
 */

/**
 * Ruta de la imagen placeholder por defecto para avatares
 * Puedes crear una imagen placeholder específica para usuarios
 */
const DEFAULT_AVATAR_PLACEHOLDER = '/images/avatar-default.svg';

/**
 * Obtiene la URL del avatar del usuario con fallback al placeholder
 *
 * @param userId - ID del usuario
 * @param hasAvatar - Indica si el usuario tiene avatar (opcional)
 * @param cacheBuster - Timestamp para invalidar cache (opcional)
 * @returns URL válida del avatar o placeholder por defecto
 *
 * @example
 * ```tsx
 * const avatarUrl = getUserAvatarUrl(user.id, user.hasAvatar);
 * <img src={avatarUrl} alt={user.name} />
 * ```
 */
export function getUserAvatarUrl(
  userId?: string | null,
  hasAvatar?: boolean,
  cacheBuster?: number
): string {
  // Si no hay userId o explícitamente no tiene avatar, usar placeholder
  if (!userId || hasAvatar === false) {
    return DEFAULT_AVATAR_PLACEHOLDER;
  }

  // Si tiene avatar, construir URL del endpoint
  if (hasAvatar === true) {
    const baseUrl = `/api/images/users/${userId}/avatar`;
    // Añadir cache buster si se proporciona para forzar recarga
    return cacheBuster ? `${baseUrl}?v=${cacheBuster}` : baseUrl;
  }

  // Si no se proporcionó hasAvatar (undefined), usar placeholder por defecto
  // para evitar 404 en consola
  return DEFAULT_AVATAR_PLACEHOLDER;
}

/**
 * Handler para evento onError de avatares
 * Cambia la imagen a placeholder si falla la carga
 *
 * @example
 * ```tsx
 * <img
 *   src={getUserAvatarUrl(user.id)}
 *   onError={handleAvatarError}
 *   alt="User avatar"
 * />
 * ```
 */
export function handleAvatarError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;

  // Evitar loop infinito si el placeholder también falla
  if (img.src !== DEFAULT_AVATAR_PLACEHOLDER && !img.src.endsWith(DEFAULT_AVATAR_PLACEHOLDER)) {
    img.src = DEFAULT_AVATAR_PLACEHOLDER;
  }
}

/**
 * Paleta de colores de fondo para avatares default.
 * Cada usuario recibe un color determinista basado en su ID.
 */
const AVATAR_COLORS = [
  '#1E3A5F', // azul marino
  '#2D1B4E', // púrpura oscuro
  '#1B4332', // verde bosque
  '#4A1942', // burdeos
  '#1C3D5A', // azul petróleo
  '#3B1F2B', // vino
  '#2C3333', // gris carbón
  '#1A3636', // verde azulado oscuro
  '#3D2C2E', // marrón oscuro
  '#1F2937', // slate oscuro
];

/**
 * Obtiene un color de fondo determinista para un usuario basado en su ID.
 * El mismo userId siempre devuelve el mismo color.
 */
export function getAvatarColor(userId?: string | null): string {
  if (!userId) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Obtiene las iniciales del nombre de usuario para usar como fallback visual
 *
 * @param name - Nombre del usuario
 * @param username - Username del usuario (fallback)
 * @returns Iniciales (máximo 2 caracteres)
 *
 * @example
 * ```tsx
 * const initials = getUserInitials(user.name, user.username);
 * // "JD" para "John Doe"
 * ```
 */
export function getUserInitials(name?: string | null, username?: string | null): string {
  const displayName = name || username || '?';

  const words = displayName.trim().split(/\s+/);

  if (words.length >= 2) {
    // Tomar primera letra de las dos primeras palabras
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    // Tomar las dos primeras letras de la única palabra
    return displayName.substring(0, 2).toUpperCase();
  }
}
