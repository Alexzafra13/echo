import { SetMetadata } from '@nestjs/common';

/**
 * @Public() - Marca una ruta como pública (sin necesidad de autenticación JWT)
 * 
 * EN ESTA APP: Solo se usa en POST /auth/login
 * 
 * @example
 * ```typescript
 * @Post('login')
 * @Public()
 * async login(@Body() dto: LoginRequestDto) {
 *   return this.loginUseCase.execute(dto);
 * }
 * ```
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);