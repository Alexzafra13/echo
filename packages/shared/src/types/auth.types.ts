export interface User {
  id: string;
  username: string;
  name?: string;
  isAdmin: boolean;
  hasAvatar?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
