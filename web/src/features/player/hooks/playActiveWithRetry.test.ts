import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playActiveWithRetry } from './playActiveWithRetry';
import type { AudioElements } from './useAudioElements';

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('playActiveWithRetry', () => {
  let mockAudioElements: { playActive: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioElements = {
      playActive: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should play successfully on first attempt without retrying', async () => {
    await playActiveWithRetry(mockAudioElements as unknown as AudioElements, false);

    expect(mockAudioElements.playActive).toHaveBeenCalledTimes(1);
    expect(mockAudioElements.playActive).toHaveBeenCalledWith(false);
  });

  it('should retry with flipped bufferFirst when first attempt fails', async () => {
    mockAudioElements.playActive
      .mockRejectedValueOnce(new Error('Autoplay blocked'))
      .mockResolvedValueOnce(undefined);

    await playActiveWithRetry(mockAudioElements as unknown as AudioElements, false);

    expect(mockAudioElements.playActive).toHaveBeenCalledTimes(2);
    expect(mockAudioElements.playActive).toHaveBeenNthCalledWith(1, false);
    expect(mockAudioElements.playActive).toHaveBeenNthCalledWith(2, true); // flipped
  });

  it('should flip bufferFirst=true to false on retry', async () => {
    mockAudioElements.playActive
      .mockRejectedValueOnce(new Error('Buffer error'))
      .mockResolvedValueOnce(undefined);

    await playActiveWithRetry(mockAudioElements as unknown as AudioElements, true);

    expect(mockAudioElements.playActive).toHaveBeenNthCalledWith(1, true);
    expect(mockAudioElements.playActive).toHaveBeenNthCalledWith(2, false); // flipped
  });

  it('should not throw when both attempts fail (graceful)', async () => {
    mockAudioElements.playActive
      .mockRejectedValueOnce(new Error('First fail'))
      .mockRejectedValueOnce(new Error('Second fail'));

    // Should not throw
    await expect(
      playActiveWithRetry(mockAudioElements as unknown as AudioElements, false)
    ).resolves.toBeUndefined();

    expect(mockAudioElements.playActive).toHaveBeenCalledTimes(2);
  });

  it('should default bufferFirst to false when not specified', async () => {
    await playActiveWithRetry(mockAudioElements as unknown as AudioElements);

    expect(mockAudioElements.playActive).toHaveBeenCalledWith(false);
  });
});
