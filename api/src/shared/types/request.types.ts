import { FastifyRequest } from 'fastify';

// Usuario autenticado (lo que retorna JwtStrategy.validate)
export interface JwtUser {
  id: string;
  username: string;
  passwordHash: string;
  name?: string;
  isActive: boolean;
  isAdmin: boolean;
  theme: string;
  language: string;
  mustChangePassword: boolean;
  avatarPath?: string;
  avatarMimeType?: string;
  avatarSize?: number;
  avatarUpdatedAt?: Date;
  lastLoginAt?: Date;
  lastAccessAt?: Date;
  isPublicProfile: boolean;
  showTopTracks: boolean;
  showTopArtists: boolean;
  showTopAlbums: boolean;
  showPlaylists: boolean;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request con usuario autenticado
export interface RequestWithUser extends FastifyRequest {
  user: JwtUser;
}

// Lo que va codificado en el JWT (mínimo necesario)
export interface JwtTokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface JwtSignOptions {
  expiresIn?: string;
  secret?: string;
}
