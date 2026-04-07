import { useMutation } from '@tanstack/react-query';
import { profileService } from '../services/profile.service';

/**
 * Hook para subir el avatar del usuario
 */
export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
  });
}
