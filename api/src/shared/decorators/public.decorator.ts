import { SetMetadata } from '@nestjs/common';

// Marca ruta como pública (sin JWT)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
