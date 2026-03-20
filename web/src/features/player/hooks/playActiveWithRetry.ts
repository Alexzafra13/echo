/**
 * Try to play the active audio element, retrying once with the opposite
 * buffer-wait strategy if the first attempt fails.
 *
 * Mobile browsers often reject the first play() due to autoplay policy
 * or buffering issues. Retrying with/without buffer wait recovers from
 * the most common failure modes.
 *
 * @param bufferFirst - If true, waits for buffer then retries without.
 *                      If false, plays immediately then retries with buffer.
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
