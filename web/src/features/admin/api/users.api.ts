import { apiClient } from '@shared/services/api';

export interface User {
  id: string;
  username: string;
  name?: string;
  isAdmin: boolean;
  isActive: boolean;
  avatarPath?: string;
  createdAt: string;
  lastLoginAt?: string;
  isSystemAdmin: boolean;
}

export interface CreateUserRequest {
  username: string;
  name?: string;
  isAdmin: boolean;
}

export interface CreateUserResponse {
  user: User;
  temporaryPassword: string;
}

export interface UpdateUserRequest {
  name?: string;
  isAdmin?: boolean;
  isActive?: boolean;
}

export interface ListUsersResponse {
  users: User[];
  total: number;
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
}

export const usersApi = {
  async list(skip: number = 0, take: number = 100): Promise<ListUsersResponse> {
    const response = await apiClient.get<ListUsersResponse>(
      `/admin/users?skip=${skip}&take=${take}`
    );
    return response.data;
  },

  async create(data: CreateUserRequest): Promise<CreateUserResponse> {
    const response = await apiClient.post<CreateUserResponse>('/admin/users', data);
    return response.data;
  },

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<User>(`/admin/users/${id}`, data);
    return response.data;
  },

  // Desactiva un usuario (soft delete)
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  // Elimina permanentemente un usuario (hard delete)
  async permanentlyDelete(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}/permanently`);
  },

  async resetPassword(id: string): Promise<ResetPasswordResponse> {
    const response = await apiClient.post<ResetPasswordResponse>(
      `/admin/users/${id}/reset-password`
    );
    return response.data;
  },
};
