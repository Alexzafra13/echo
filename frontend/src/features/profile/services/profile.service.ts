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
};
