import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser, AllowChangePassword, Public } from '@shared/decorators';
import {
  LoginUseCase,
  RefreshTokenUseCase,
} from '../domain/use-cases';
import {
  LoginRequestDto,
  AuthResponseDto,
  RefreshTokenResponseDto,
  RefreshTokenRequestDto,
} from './dtos';

/**
 * AuthController - Gestiona autenticación y autorización
 *
 * Rutas:
 * - POST /auth/login → @Public() (única ruta sin JWT en toda la app)
 * - POST /auth/refresh → Requiere JWT válido
 * - GET /auth/me → Requiere JWT + permite si mustChangePassword=true
 */
@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard) // Aplicar guard a todo el controlador
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  /**
   * Login - ÚNICA ruta pública de toda la aplicación
   * No requiere JWT porque el usuario aún no está autenticado
   * Rate limit: 5 intentos por minuto para prevenir fuerza bruta
   */
  @Post('login')
  @Public() // ← IMPORTANTE: Única ruta con @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica un usuario con username y password. Retorna tokens JWT (access y refresh) y datos del usuario.'
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Retorna access token, refresh token y datos del usuario',
    type: AuthResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas'
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos de login. Por favor, espera un minuto.'
  })
  async login(@Body() dto: LoginRequestDto): Promise<AuthResponseDto> {
    const result = await this.loginUseCase.execute({
      username: dto.username,
      password: dto.password,
    });

    return AuthResponseDto.fromDomain(result);
  }

  /**
   * Refresh Token - Requiere JWT válido (refresh token)
   * NO es público porque el refresh token ya es un JWT
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Refrescar tokens',
    description: 'Genera un nuevo par de tokens (access y refresh) usando un refresh token válido'
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refrescados exitosamente',
    type: RefreshTokenResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado'
  })
  async refreshToken(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    const result = await this.refreshTokenUseCase.execute({
      refreshToken: dto.refreshToken,
    });

    return RefreshTokenResponseDto.fromDomain(result);
  }

  /**
   * Get Me - Ver perfil del usuario autenticado
   * Permite acceso incluso si mustChangePassword=true
   */
  @Get('me')
  @AllowChangePassword() // ← Usuario puede ver su perfil aunque deba cambiar password
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener perfil actual',
    description: 'Retorna los datos del usuario autenticado actualmente'
  })
  @ApiResponse({
    status: 200,
    description: 'Datos del usuario obtenidos exitosamente'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado o token inválido'
  })
  async me(@CurrentUser() user: any) {
    return { user };
  }
}