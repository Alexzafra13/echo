// src/features/auth/domain/ports/user-repository.port.ts
import { User } from '../entities/user.entity';

export interface UserUpdateableFields {
  username?: string;
  name?: string;
  email?: string;
  theme?: string;
  language?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  mustChangePassword?: boolean;
  avatarPath?: string | null;
  avatarMimeType?: string | null;
  avatarSize?: bigint | null;
  avatarUpdatedAt?: Date | null;
  lastLoginAt?: Date;
  lastAccessAt?: Date;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(skip: number, take: number): Promise<User[]>;
  count(): Promise<number>;

  create(user: User): Promise<User>;
  updatePartial(id: string, data: Partial<UserUpdateableFields>): Promise<User>;
  updatePassword(userId: string, newPasswordHash: string): Promise<void>;
  updateAdminStatus(userId: string, isAdmin: boolean): Promise<void>;
  delete(userId: string): Promise<void>;
}

export const USER_REPOSITORY = 'IUserRepository';