import { useMutation } from '@tanstack/react-query';
import { profileService, ChangePasswordDto, UpdateProfileDto } from '../services/profile.service';

/**
 * Hook to change user password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordDto) => profileService.changePassword(data),
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: UpdateProfileDto) => profileService.updateProfile(data),
  });
}
