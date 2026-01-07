import { FastifyRequest } from 'fastify';

/**
 * JwtUser - Usuario autenticado extraído del token JWT
 *
 * Este es el objeto que JwtStrategy.validate() retorna (user.toPrimitives()).
 * Usar este tipo en lugar de `any` con el decorador @CurrentUser().
 */
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

/**
 * RequestWithUser - Request autenticado con información del usuario
 *
 * Usar este tipo en lugar de `any` en controllers que requieren autenticación.
 */
export interface RequestWithUser extends FastifyRequest {
  user: JwtUser;
}

/**
 * JwtTokenPayload - Payload codificado en el token JWT
 *
 * Contiene solo la información mínima necesaria en el token.
 * Los datos completos del usuario se obtienen desde la BD.
 */
export interface JwtTokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * JwtSignOptions - Opciones para firmar tokens JWT
 */
export interface JwtSignOptions {
  expiresIn?: string;
  secret?: string;
}
