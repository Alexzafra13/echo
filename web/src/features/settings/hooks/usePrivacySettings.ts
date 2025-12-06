import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  settingsService,
  PrivacySettings,
  UpdatePrivacySettingsRequest,
  HomePreferences,
  UpdateHomePreferencesRequest,
} from '../services/settings.service';

export function usePrivacySettings() {
  return useQuery<PrivacySettings>({
    queryKey: ['privacy-settings'],
    queryFn: () => settingsService.getPrivacySettings(),
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePrivacySettingsRequest) =>
      settingsService.updatePrivacySettings(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['privacy-settings'], data);
    },
  });
}

export function useChangeTheme() {
  return useMutation({
    mutationFn: (theme: 'dark' | 'light') => settingsService.changeTheme(theme),
  });
}

export function useChangeLanguage() {
  return useMutation({
    mutationFn: (language: 'es' | 'en') => settingsService.changeLanguage(language),
  });
}

export function useHomePreferences() {
  return useQuery<HomePreferences>({
    queryKey: ['home-preferences'],
    queryFn: () => settingsService.getHomePreferences(),
  });
}

export function useUpdateHomePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateHomePreferencesRequest) =>
      settingsService.updateHomePreferences(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['home-preferences'], data);
    },
  });
}
