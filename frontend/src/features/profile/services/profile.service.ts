import { apiClient } from '@shared/services/api';
import { User } from '@shared/store';

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  name?: string;
}

/**
 * Profile API service
 * Handles user profile operations
 */
export const profileService = {
  /**
   * Change user password
   */
  changePassword: async (data: ChangePasswordDto): Promise<void> => {
    await apiClient.put('/users/password', data);
  },

  /**
   * Update user profile (name)
   */
  updateProfile: async (data: UpdateProfileDto): Promise<User> => {
    const response = await apiClient.put<User>('/users/profile', data);
    return response.data;
  },

  /**
   * Upload user avatar
   */
  uploadAvatar: async (file: File): Promise<{ avatarPath: string; avatarSize: number; avatarMimeType: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    // Delete the default Content-Type header so axios can set multipart/form-data with boundary
    const response = await apiClient.post('/users/avatar', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  },

  /**
   * Delete user avatar
   */
  deleteAvatar: async (): Promise<void> => {
    await apiClient.delete('/users/avatar');
  },
};
