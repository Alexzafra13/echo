import { useMutation } from '@tanstack/react-query';
import { profileService } from '../services/profile.service';

/**
 * Hook for uploading user avatar
 */
export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
  });
}
