import { FastifyRequest } from 'fastify';

/**
 * JWT User - The user object attached to requests after JWT validation
 * This is what JwtStrategy.validate() returns (user.toPrimitives())
 * Use this type instead of `any` for @CurrentUser() decorator
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
 * Authenticated request with user information
 * Use this instead of `any` in controllers
 */
export interface RequestWithUser extends FastifyRequest {
  user: JwtUser;
}

/**
 * JWT Token Payload - What's encoded in the JWT token
 * This is minimal info stored in the token itself
 */
export interface JwtTokenPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Sign Options - Options for signing JWT tokens
 */
export interface JwtSignOptions {
  expiresIn?: string;
  secret?: string;
}
