import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extrae el usuario del request. Usa @CurrentUser() para el objeto completo
 * o @CurrentUser('id') para una propiedad específica.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data && user) {
      return user[data];
    }

    return user;
  },
);