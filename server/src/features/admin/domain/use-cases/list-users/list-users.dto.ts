export interface ListUsersInput {
  skip?: number;
  take?: number;
}

export interface ListUsersOutput {
  users: Array<{
    id: string;
    username: string;
    email?: string;
    name?: string;
    isAdmin: boolean;
    isActive: boolean;
    avatarPath?: string;
    mustChangePassword: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
  }>;
  total: number;
}