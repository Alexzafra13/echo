import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  federationApi,
  CreateInvitationRequest,
  ConnectToServerRequest,
  UpdatePermissionsRequest,
} from '../api/federation.api';

// ============================================
// Invitation Tokens Hooks
// ============================================

/**
 * Hook para listar tokens de invitación
 */
export function useInvitationTokens() {
  return useQuery({
    queryKey: ['federation', 'invitations'],
    queryFn: () => federationApi.listInvitations(),
  });
}

/**
 * Hook para crear un token de invitación
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationRequest) => federationApi.createInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'invitations'] });
    },
  });
}

/**
 * Hook para eliminar un token de invitación
 */
export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => federationApi.deleteInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'invitations'] });
    },
  });
}

// ============================================
// Connected Servers Hooks
// ============================================

/**
 * Hook para listar servidores conectados
 */
export function useConnectedServers() {
  return useQuery({
    queryKey: ['federation', 'servers'],
    queryFn: () => federationApi.listServers(),
  });
}

/**
 * Hook para obtener un servidor específico
 */
export function useConnectedServer(id: string) {
  return useQuery({
    queryKey: ['federation', 'servers', id],
    queryFn: () => federationApi.getServer(id),
    enabled: !!id,
  });
}

/**
 * Hook para conectar a un nuevo servidor
 */
export function useConnectToServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConnectToServerRequest) => federationApi.connectToServer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'servers'] });
    },
  });
}

/**
 * Hook para sincronizar con un servidor
 */
export function useSyncServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => federationApi.syncServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'servers'] });
    },
  });
}

/**
 * Hook para desconectar de un servidor
 */
export function useDisconnectFromServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => federationApi.disconnectFromServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'servers'] });
    },
  });
}

// ============================================
// Remote Library Hooks
// ============================================

/**
 * Hook para obtener la biblioteca de un servidor remoto
 */
export function useRemoteLibrary(serverId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['federation', 'library', serverId, page, limit],
    queryFn: () => federationApi.getRemoteLibrary(serverId, page, limit),
    enabled: !!serverId,
  });
}

/**
 * Hook para obtener álbums de un servidor remoto
 */
export function useRemoteAlbums(
  serverId: string,
  page = 1,
  limit = 50,
  search?: string
) {
  return useQuery({
    queryKey: ['federation', 'albums', serverId, page, limit, search],
    queryFn: () => federationApi.getRemoteAlbums(serverId, page, limit, search),
    enabled: !!serverId,
  });
}

/**
 * Hook para obtener un álbum remoto con sus tracks
 */
export function useRemoteAlbum(serverId: string, albumId: string) {
  return useQuery({
    queryKey: ['federation', 'album', serverId, albumId],
    queryFn: () => federationApi.getRemoteAlbum(serverId, albumId),
    enabled: !!serverId && !!albumId,
  });
}

// ============================================
// Access Tokens Hooks (Servidores con acceso a tu biblioteca)
// ============================================

/**
 * Hook para listar servidores con acceso a tu biblioteca
 */
export function useAccessTokens() {
  return useQuery({
    queryKey: ['federation', 'access-tokens'],
    queryFn: () => federationApi.listAccessTokens(),
  });
}

/**
 * Hook para revocar acceso de un servidor
 */
export function useRevokeAccessToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => federationApi.revokeAccessToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'access-tokens'] });
    },
  });
}

/**
 * Hook para actualizar permisos de un servidor
 */
export function useUpdatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: UpdatePermissionsRequest }) =>
      federationApi.updatePermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federation', 'access-tokens'] });
    },
  });
}
