import { useMutation } from '@tanstack/react-query';
import { profileService } from '../services/profile.service';

/**
 * Hook para eliminar el avatar del usuario
 */
export function useDeleteAvatar() {
  return useMutation({
    mutationFn: () => profileService.deleteAvatar(),
  });
}
