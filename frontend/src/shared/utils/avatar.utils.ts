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
 * @returns URL válida del avatar o placeholder por defecto
 *
 * @example
 * ```tsx
 * const avatarUrl = getUserAvatarUrl(user.id);
 * <img src={avatarUrl} alt={user.name} />
 * ```
 *
 * Note: El backend puede incluir un parámetro ?v=timestamp cuando
 * la imagen cambia, por lo que no necesitamos cache busting manual aquí.
 */
export function getUserAvatarUrl(userId?: string | null, hasAvatar?: boolean): string {
  // Si no hay userId o explícitamente no tiene avatar, usar placeholder
  if (!userId || hasAvatar === false) {
    return DEFAULT_AVATAR_PLACEHOLDER;
  }

  // Si tiene avatar, construir URL del endpoint
  // El backend incluye ?v=timestamp para cache busting automático si es necesario
  if (hasAvatar === true) {
    return `/api/images/users/${userId}/avatar`;
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
