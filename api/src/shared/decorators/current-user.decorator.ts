import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() - Decorador para inyectar el usuario autenticado en el controlador
 *
 * Extrae el usuario del request (inyectado por JwtAuthGuard) y lo pasa como parámetro.
 * Opcionalmente puede extraer una propiedad específica del usuario.
 *
 * @example
 * ```typescript
 * // Obtener usuario completo
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtUser) {
 *   return user;
 * }
 *
 * // Obtener solo el ID del usuario
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Si se especifica una propiedad, retornar solo esa propiedad
    if (data && user) {
      return user[data];
    }

    // Si no, retornar el usuario completo
    return user;
  },
);