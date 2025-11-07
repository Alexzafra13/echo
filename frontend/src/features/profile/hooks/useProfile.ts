import { useMutation } from '@tanstack/react-query';
import { profileService, ChangePasswordDto } from '../services/profile.service';

/**
 * Hook to change user password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordDto) => profileService.changePassword(data),
  });
}
