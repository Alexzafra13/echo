/**
 * Image Utilities
 *
 * Shared utilities for image handling in metadata system
 */

/**
 * Image type for metadata
 */
export type ImageType =
  | 'cover'
  | 'artist-avatar'
  | 'artist-background'
  | 'artist-banner'
  | 'artist-logo'
  | 'artist-profile';

/**
 * Build image URL for metadata images
 *
 * @param entityId - Entity ID (album, artist, etc.)
 * @param imageType - Type of image
 * @param tag - Cache busting tag (optional)
 * @returns Full image URL
 */
export function buildImageUrl(
  entityId: string,
  imageType: ImageType,
  tag?: string
): string {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

  // Map image type to endpoint
  const endpoint = getImageEndpoint(imageType);

  // Build URL
  let url = `${API_BASE_URL}${endpoint}/${entityId}`;

  // Add cache busting tag if provided
  if (tag) {
    url += `?tag=${tag}`;
  }

  return url;
}

/**
 * Get API endpoint for image type
 *
 * @param imageType - Type of image
 * @returns API endpoint path
 */
function getImageEndpoint(imageType: ImageType): string {
  const endpoints: Record<ImageType, string> = {
    'cover': '/albums/cover',
    'artist-avatar': '/artists/avatar',
    'artist-background': '/artists/background',
    'artist-banner': '/artists/banner',
    'artist-logo': '/artists/logo',
    'artist-profile': '/artists/profile',
  };

  return endpoints[imageType] || '/albums/cover';
}

/**
 * Get placeholder image for type
 *
 * @param _imageType - Type of image (reserved for future use)
 * @returns Placeholder SVG or image path
 */
export function getPlaceholderImage(_imageType: ImageType): string {
  // Could return different placeholders per type
  // For now, return generic music placeholder
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="rgba(0,0,0,0.5)" font-family="sans-serif" font-size="30" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
}

/**
 * Validate image file
 *
 * @param file - File object to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): { valid: boolean; message: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      message: 'Formato no válido. Solo se permiten JPG, PNG, WebP y GIF',
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      message: 'Archivo demasiado grande. Máximo 10MB',
    };
  }

  return { valid: true, message: '' };
}

/**
 * Preload image to break browser cache
 *
 * @param url - Image URL to preload
 * @returns Promise that resolves when image loads
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
