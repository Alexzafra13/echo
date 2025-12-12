import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for AllowChangePassword decorator
 */
export const ALLOW_CHANGE_PASSWORD_KEY = 'allowChangePassword';

/**
 * @AllowChangePassword() - Marca una ruta como accesible
 * incluso si mustChangePassword = true
 *
 * Usar en:
 * - PUT /users/password (cambiar contraseña)
 * - GET /auth/me (ver perfil propio)
 */
export const AllowChangePassword = () => SetMetadata(ALLOW_CHANGE_PASSWORD_KEY, true);