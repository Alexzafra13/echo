/**
 * Intenta reproducir el audio activo. Si falla (autoplay policy, buffering),
 * reintenta con la estrategia opuesta de buffer.
 */
import { logger } from '@shared/utils/logger';
import type { AudioElements } from './useAudioElements';

export async function playActiveWithRetry(
  audioElements: AudioElements,
  bufferFirst: boolean = false
): Promise<void> {
  try {
    await audioElements.playActive(bufferFirst);
  } catch (error) {
    logger.warn('[Player] Play failed, retrying:', (error as Error).message);
    try {
      await audioElements.playActive(!bufferFirst);
    } catch (retryError) {
      logger.error('[Player] Retry also failed:', (retryError as Error).message);
    }
  }
}
