import { apiClient } from '@shared/services/api';

export interface PrivacySettings {
  isPublicProfile: boolean;
  showTopTracks: boolean;
  showTopArtists: boolean;
  showTopAlbums: boolean;
  showPlaylists: boolean;
  bio?: string;
}

export interface UpdatePrivacySettingsRequest {
  isPublicProfile?: boolean;
  showTopTracks?: boolean;
  showTopArtists?: boolean;
  showTopAlbums?: boolean;
  showPlaylists?: boolean;
  bio?: string | null;
}

export const settingsService = {
  async getPrivacySettings(): Promise<PrivacySettings> {
    const response = await apiClient.get<PrivacySettings>('/users/privacy');
    return response.data;
  },

  async updatePrivacySettings(data: UpdatePrivacySettingsRequest): Promise<PrivacySettings> {
    const response = await apiClient.put<PrivacySettings>('/users/privacy', data);
    return response.data;
  },

  async changeTheme(theme: 'dark' | 'light'): Promise<void> {
    await apiClient.put('/users/theme', { theme });
  },

  async changeLanguage(language: 'es' | 'en'): Promise<void> {
    await apiClient.put('/users/language', { language });
  },
};
