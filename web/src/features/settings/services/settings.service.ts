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

export type HomeSectionId =
  | 'recent-albums'
  | 'artist-mix'
  | 'genre-mix'
  | 'recently-played'
  | 'my-playlists'
  | 'top-played'
  | 'favorite-radios'
  | 'surprise-me'
  | 'shared-libraries';

export interface HomeSectionConfig {
  id: HomeSectionId;
  enabled: boolean;
  order: number;
}

export interface HomePreferences {
  homeSections: HomeSectionConfig[];
}

export interface UpdateHomePreferencesRequest {
  homeSections: HomeSectionConfig[];
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

  async getHomePreferences(): Promise<HomePreferences> {
    const response = await apiClient.get<HomePreferences>('/users/home-preferences');
    return response.data;
  },

  async updateHomePreferences(data: UpdateHomePreferencesRequest): Promise<HomePreferences> {
    const response = await apiClient.put<HomePreferences>('/users/home-preferences', data);
    return response.data;
  },
};
