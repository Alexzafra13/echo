import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadTrack, downloadAlbum } from '../download.service';

vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

import { apiClient } from '../api';

describe('download.service', () => {
  let _appendedLink: HTMLAnchorElement | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    _appendedLink = null;

    // Mock DOM operations
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement);

    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      _appendedLink = node as HTMLAnchorElement;
      return node;
    });

    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  describe('downloadTrack', () => {
    it('should fetch token and trigger download', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { token: 'abc123' } });

      await downloadTrack('track-1', 'song.mp3');

      expect(apiClient.get).toHaveBeenCalledWith('/stream-token');
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should set correct URL with token', async () => {
      const mockLink = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      vi.mocked(apiClient.get).mockResolvedValue({ data: { token: 'tok-xyz' } });

      await downloadTrack('t-123', 'my-song.mp3');

      expect(mockLink.href).toBe('/api/tracks/t-123/download?token=tok-xyz');
      expect(mockLink.download).toBe('my-song.mp3');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('downloadAlbum', () => {
    it('should download album ZIP with correct filename', async () => {
      const mockLink = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
      vi.mocked(apiClient.get).mockResolvedValue({ data: { token: 'tok-abc' } });

      await downloadAlbum('alb-1', 'OK Computer', 'Radiohead');

      expect(mockLink.href).toBe('/api/albums/alb-1/download?token=tok-abc');
      expect(mockLink.download).toBe('Radiohead - OK Computer.zip');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
