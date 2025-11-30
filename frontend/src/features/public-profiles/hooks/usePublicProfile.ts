import { useQuery } from '@tanstack/react-query';
import { publicProfilesService, PublicProfile } from '../services/public-profiles.service';

export function usePublicProfile(userId: string) {
  return useQuery<PublicProfile>({
    queryKey: ['public-profile', userId],
    queryFn: () => publicProfilesService.getPublicProfile(userId),
    enabled: !!userId,
  });
}
