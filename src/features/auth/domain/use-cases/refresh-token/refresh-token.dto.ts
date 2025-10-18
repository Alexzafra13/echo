/**
 * RefreshTokenInput - Datos de entrada
 */
export interface RefreshTokenInput {
  refreshToken: string;
}

/**
 * RefreshTokenOutput - Datos de salida
 */
export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}