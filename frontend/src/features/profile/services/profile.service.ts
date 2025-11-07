import { apiClient } from '@shared/services/api';

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
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
};
