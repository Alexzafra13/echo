import { User } from '../entities/user.entity';

export interface TokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface TokenOutput {
  accessToken: string;
  refreshToken: string;
}

// Contrato para generación y verificación de tokens JWT
export interface ITokenService {
  generateAccessToken(user: User): Promise<string>;
  generateRefreshToken(user: User): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  verifyRefreshToken(token: string): Promise<TokenPayload>;
}

export const TOKEN_SERVICE = 'ITokenService';
