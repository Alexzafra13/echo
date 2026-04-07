import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsService } from './settings.service';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('privacy settings', () => {
    it('should GET privacy settings', async () => {
      const mockSettings = { isPublicProfile: true, showTopTracks: true };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSettings });

      const result = await settingsService.getPrivacySettings();
      expect(apiClient.get).toHaveBeenCalledWith('/users/privacy');
      expect(result).toEqual(mockSettings);
    });

    it('should PUT privacy settings update', async () => {
      const update = { isPublicProfile: false };
      vi.mocked(apiClient.put).mockResolvedValue({ data: update });

      const result = await settingsService.updatePrivacySettings(update);
      expect(apiClient.put).toHaveBeenCalledWith('/users/privacy', update);
      expect(result).toEqual(update);
    });
  });

  describe('theme and language', () => {
    it('should change theme', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({});

      await settingsService.changeTheme('dark');
      expect(apiClient.put).toHaveBeenCalledWith('/users/theme', { theme: 'dark' });
    });

    it('should change language', async () => {
      vi.mocked(apiClient.put).mockResolvedValue({});

      await settingsService.changeLanguage('en');
      expect(apiClient.put).toHaveBeenCalledWith('/users/language', { language: 'en' });
    });
  });

  describe('home preferences', () => {
    it('should GET home preferences', async () => {
      const mockPrefs = { homeSections: [{ id: 'recent-albums', enabled: true, order: 0 }] };
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPrefs });

      const result = await settingsService.getHomePreferences();
      expect(apiClient.get).toHaveBeenCalledWith('/users/home-preferences');
      expect(result).toEqual(mockPrefs);
    });

    it('should PUT home preferences', async () => {
      const update = { homeSections: [{ id: 'recent-albums', enabled: false, order: 1 }] };
      vi.mocked(apiClient.put).mockResolvedValue({ data: update });

      const result = await settingsService.updateHomePreferences(update as never);
      expect(apiClient.put).toHaveBeenCalledWith('/users/home-preferences', update);
      expect(result).toEqual(update);
    });
  });
});
