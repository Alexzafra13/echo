import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, CreateUserRequest, UpdateUserRequest } from '../api/users.api';

/**
 * Hook para listar usuarios
 */
export function useUsers(skip: number = 0, take: number = 100) {
  return useQuery({
    queryKey: ['admin', 'users', skip, take],
    queryFn: () => usersApi.list(skip, take),
  });
}

/**
 * Hook para crear un nuevo usuario
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: () => {
      // Invalidar cache de usuarios para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/**
 * Hook para actualizar un usuario
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/**
 * Hook para eliminar (desactivar) un usuario
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/**
 * Hook para resetear contraseña de un usuario
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id),
  });
}

/**
 * Hook para eliminar permanentemente un usuario (hard delete)
 */
export function usePermanentlyDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.permanentlyDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
