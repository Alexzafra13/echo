import { User } from '../entities/user.entity';

/**
 * TokenPayload - Lo que va dentro del JWT
 * Es la información que se codifica en el token
 */
export interface TokenPayload {
  userId: string;
  username: string;
  // Campos estándar de JWT agregados automáticamente
  iat?: number; // Issued At (timestamp)
  exp?: number; // Expiration (timestamp)
}

/**
 * TokenOutput - La respuesta al generar tokens
 * Devuelve access token y refresh token
 */
export interface TokenOutput {
  accessToken: string;
  refreshToken: string;
}

/**
 * ITokenService Port - Define contrato para generar/verificar tokens JWT
 *
 * Esta es una INTERFAZ (contrato)
 * Define QUÉ métodos necesita el dominio para trabajar con tokens
 * NO define CÓMO se implementan (eso va en Infrastructure con JwtService)
 *
 * Métodos:
 * - generateAccessToken: Generar JWT de corta duración (24h)
 * - generateRefreshToken: Generar JWT de larga duración (7d)
 * - verifyAccessToken: Verificar y decodificar access token
 * - verifyRefreshToken: Verificar y decodificar refresh token
 */
export interface ITokenService {
  /**
   * Genera un JWT access token para un usuario
   * @param user - La entidad User
   * @returns Token JWT como string
   * 
   * El token expira en JWT_EXPIRATION (default: 24h)
   */
  generateAccessToken(user: User): Promise<string>;

  /**
   * Genera un JWT refresh token para un usuario
   * @param user - La entidad User
   * @returns Token JWT como string
   * 
   * El token expira en JWT_REFRESH_EXPIRATION (default: 7d)
   * Se usa para obtener nuevos access tokens sin re-loguear
   */
  generateRefreshToken(user: User): Promise<string>;

  /**
   * Verifica y decodifica un access token
   * @param token - El JWT a verificar
   * @returns TokenPayload con userId y username
   * 
   * Lanza error si token es inválido o expirado
   */
  verifyAccessToken(token: string): Promise<TokenPayload>;

  /**
   * Verifica y decodifica un refresh token
   * @param token - El JWT a verificar
   * @returns TokenPayload con userId y username
   * 
   * Lanza error si token es inválido o expirado
   */
  verifyRefreshToken(token: string): Promise<TokenPayload>;
}

/**
 * Constante con el nombre del provider
 * Se usa en NestJS para inyección de dependencias
 * 
 * Uso:
 * @Inject(TOKEN_SERVICE)
 * private readonly tokenService: ITokenService
 */
export const TOKEN_SERVICE = 'ITokenService';