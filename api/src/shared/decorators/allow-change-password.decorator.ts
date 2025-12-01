import { SetMetadata } from '@nestjs/common';

/**
 * @AllowChangePassword() - Marca una ruta como accesible 
 * incluso si mustChangePassword = true
 * 
 * Usar en:
 * - PUT /users/password (cambiar contraseña)
 * - GET /auth/me (ver perfil propio)
 */
export const AllowChangePassword = () => SetMetadata('allowChangePassword', true);