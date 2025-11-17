import { FastifyRequest } from 'fastify';

/**
 * Authenticated request with user information
 * Use this instead of `any` in controllers
 */
export interface RequestWithUser extends FastifyRequest {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}
