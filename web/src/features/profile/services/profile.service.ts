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
 * Servicio API de perfil
 * Gestiona las operaciones del perfil de usuario
 */
export const profileService = {
  /**
   * Cambiar contraseña del usuario
   */
  changePassword: async (data: ChangePasswordDto): Promise<void> => {
    await apiClient.put('/users/password', data);
  },

  /**
   * Actualizar perfil del usuario (nombre)
   */
  updateProfile: async (data: UpdateProfileDto): Promise<User> => {
    const response = await apiClient.put<User>('/users/profile', data);
    return response.data;
  },

  /**
   * Subir avatar del usuario
   */
  uploadAvatar: async (file: File): Promise<{ avatarPath: string; avatarSize: number; avatarMimeType: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    // Eliminar el header Content-Type para que axios establezca multipart/form-data con boundary
    const response = await apiClient.post('/users/avatar', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  },

  /**
   * Eliminar avatar del usuario
   */
  deleteAvatar: async (): Promise<void> => {
    await apiClient.delete('/users/avatar');
  },
};
