import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient
vi.mock('@shared/services/api', () => ({
  apiClient: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { radioFaviconsApi } from './radio-favicons.api';
import { apiClient } from '@shared/services/api';

describe('radioFaviconsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFavicon', () => {
    it('debería enviar FormData con el archivo', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Uploaded',
          imageId: 'img-1',
          url: '/api/images/radio/uuid/favicon',
        },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const mockFile = new File(['test'], 'favicon.png', { type: 'image/png' });
      const result = await radioFaviconsApi.uploadFavicon('test-uuid', mockFile);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/admin/radio/favicons/test-uuid/upload',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      expect(result.success).toBe(true);
      expect(result.imageId).toBe('img-1');
    });
  });

  describe('deleteFavicon', () => {
    it('debería enviar DELETE al endpoint correcto', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ data: {} });

      await radioFaviconsApi.deleteFavicon('test-uuid');

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/admin/radio/favicons/test-uuid',
      );
    });
  });

  describe('autoFetch', () => {
    it('debería enviar POST con query params de nombre y homepage', async () => {
      const mockResponse = {
        data: { success: true, source: 'wikipedia', url: '/api/images/radio/uuid/favicon' },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await radioFaviconsApi.autoFetch(
        'test-uuid',
        'Radio Station',
        'https://radio.com',
      );

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/admin/radio/favicons/test-uuid/auto-fetch?'),
      );
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('name=Radio+Station'),
      );
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('homepage='),
      );
      expect(result.success).toBe(true);
    });

    it('debería enviar POST sin homepage si no se proporciona', async () => {
      const mockResponse = {
        data: { success: true, source: 'wikipedia' },
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await radioFaviconsApi.autoFetch('test-uuid', 'Radio Station');

      const callUrl = vi.mocked(apiClient.post).mock.calls[0][0] as string;
      expect(callUrl).toContain('name=Radio+Station');
      expect(callUrl).not.toContain('homepage=');
    });
  });
});
