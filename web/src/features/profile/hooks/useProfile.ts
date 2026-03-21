import { useMutation } from '@tanstack/react-query';
import { profileService, ChangePasswordDto, UpdateProfileDto } from '../services/profile.service';

/**
 * Hook para cambiar la contraseña del usuario
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordDto) => profileService.changePassword(data),
  });
}

/**
 * Hook para actualizar el perfil del usuario
 */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: UpdateProfileDto) => profileService.updateProfile(data),
  });
}
