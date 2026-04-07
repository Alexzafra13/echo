import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serverIdentityApi } from '../api/server-identity.service';

const SERVER_IDENTITY_KEY = ['admin', 'server-identity'] as const;

export function useServerIdentity() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SERVER_IDENTITY_KEY,
    queryFn: () => serverIdentityApi.getServerIdentity(),
  });

  const updateName = useMutation({
    mutationFn: (name: string) => serverIdentityApi.updateServerName(name),
    onSuccess: (_data, name) => {
      queryClient.setQueryData(
        SERVER_IDENTITY_KEY,
        (old: { name: string; color: string } | undefined) => (old ? { ...old, name } : undefined)
      );
    },
  });

  const updateColor = useMutation({
    mutationFn: (color: string) => serverIdentityApi.updateServerColor(color),
    onSuccess: (_data, color) => {
      queryClient.setQueryData(
        SERVER_IDENTITY_KEY,
        (old: { name: string; color: string } | undefined) => (old ? { ...old, color } : undefined)
      );
    },
  });

  return {
    serverName: query.data?.name ?? '',
    serverColor: query.data?.color ?? 'purple',
    isLoading: query.isLoading,
    updateName,
    updateColor,
  };
}
