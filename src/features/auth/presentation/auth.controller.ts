import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
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
   */
  @Post('login')
  @Public() // ← IMPORTANTE: Única ruta con @Public()
  @HttpCode(HttpStatus.OK)
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
  async me(@CurrentUser() user: any) {
    return { user };
  }
}