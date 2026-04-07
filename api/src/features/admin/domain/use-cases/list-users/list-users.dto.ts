export interface ListUsersInput {
  skip?: number;
  take?: number;
}

export interface ListUsersOutput {
  users: Array<{
    id: string;
    username: string;
    name?: string;
    isAdmin: boolean;
    isActive: boolean;
    avatarPath?: string;
    mustChangePassword: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    isSystemAdmin: boolean;
  }>;
  total: number;
}