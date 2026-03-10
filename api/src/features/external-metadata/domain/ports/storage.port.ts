/**
 * Port for storage operations (file system abstractions)
 */
export interface IStorageService {
  /**
   * Save an image to storage
   */
  saveImage(filePath: string, buffer: Buffer): Promise<void>;

  /**
   * Delete an image from storage
   */
  deleteImage(filePath: string): Promise<void>;

  /**
   * Get the path for a user avatar
   */
  getUserAvatarPath(userId: string, extension: string): Promise<string>;

  /**
   * Get the path for a radio station favicon
   */
  getRadioFaviconPath(stationUuid: string, extension: string): Promise<string>;
}

// Injection token
export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
