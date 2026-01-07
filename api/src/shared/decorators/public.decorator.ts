import { SetMetadata } from '@nestjs/common';

// Marca ruta como pública (sin JWT). Solo se usa en /auth/login
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);