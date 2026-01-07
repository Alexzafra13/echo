import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser, AllowChangePassword, Public } from '@shared/decorators';
import { JwtUser } from '@shared/types/request.types';
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
import { USER_REPOSITORY, IUserRepository } from '../domain/ports';

// Autenticación: login, refresh token, perfil
@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 50, ttl: 60000 } })
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

  // Consulta BD para datos actualizados (avatar, etc.)
  @Get('me')
  @AllowChangePassword()
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
  async me(@CurrentUser() jwtUser: JwtUser) {
    const freshUser = await this.userRepository.findById(jwtUser.id);

    if (!freshUser) {
      return {
        user: {
          id: jwtUser.id,
          username: jwtUser.username,
          name: jwtUser.name,
          isAdmin: jwtUser.isAdmin,
          isActive: jwtUser.isActive,
          mustChangePassword: jwtUser.mustChangePassword,
          hasAvatar: !!jwtUser.avatarPath,
          createdAt: jwtUser.createdAt,
        },
      };
    }

    return {
      user: {
        id: freshUser.id,
        username: freshUser.username,
        name: freshUser.name,
        isAdmin: freshUser.isAdmin,
        isActive: freshUser.isActive,
        mustChangePassword: freshUser.mustChangePassword,
        hasAvatar: !!freshUser.avatarPath,
        createdAt: freshUser.createdAt,
      },
    };
  }
}