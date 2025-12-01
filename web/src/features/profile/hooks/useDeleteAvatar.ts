import { useMutation } from '@tanstack/react-query';
import { profileService } from '../services/profile.service';

/**
 * Hook for deleting user avatar
 */
export function useDeleteAvatar() {
  return useMutation({
    mutationFn: () => profileService.deleteAvatar(),
  });
}
