export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginOutput {
  user: {
    id: string;
    username: string;
    email?: string;
    name?: string;
    isAdmin: boolean;
    avatarPath?: string | null;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
}