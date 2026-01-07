import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { AllowChangePassword } from '@shared/decorators/allow-change-password.decorator';
import { JwtUser } from '@shared/types/request.types';
import {
  ChangePasswordUseCase,
  UpdateProfileUseCase,
  ChangeThemeUseCase,
  ChangeLanguageUseCase,
  UploadAvatarUseCase,
  DeleteAvatarUseCase,
  UpdatePrivacySettingsUseCase,
  UpdateHomePreferencesUseCase,
} from '../domain/use-cases';
import {
  ChangePasswordRequestDto,
  UpdateProfileRequestDto,
  ChangeThemeRequestDto,
  ChangeLanguageRequestDto,
  UserResponseDto,
  UpdatePrivacySettingsRequestDto,
  PrivacySettingsResponseDto,
  UpdateHomePreferencesRequestDto,
  HomePreferencesResponseDto,
} from './dtos';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly changeThemeUseCase: ChangeThemeUseCase,
    private readonly changeLanguageUseCase: ChangeLanguageUseCase,
    private readonly uploadAvatarUseCase: UploadAvatarUseCase,
    private readonly deleteAvatarUseCase: DeleteAvatarUseCase,
    private readonly updatePrivacySettingsUseCase: UpdatePrivacySettingsUseCase,
    private readonly updateHomePreferencesUseCase: UpdateHomePreferencesUseCase,
  ) {}

  @Put('password')
  @AllowChangePassword()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description: 'Permite al usuario cambiar su contraseña actual por una nueva. Requiere la contraseña actual para validación.'
  })
  @ApiBody({ type: ChangePasswordRequestDto })
  @ApiResponse({
    status: 204,
    description: 'Contraseña cambiada exitosamente'
  })
  @ApiResponse({
    status: 400,
    description: 'Contraseña actual incorrecta o contraseña nueva inválida'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChangePasswordRequestDto,
  ): Promise<void> {
    await this.changePasswordUseCase.execute({
      userId: user.id,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar perfil',
    description: 'Actualiza la información del perfil del usuario (nombre)'
  })
  @ApiBody({ type: UpdateProfileRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: UserResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProfileRequestDto,
  ): Promise<UserResponseDto> {
    const result = await this.updateProfileUseCase.execute({
      userId: user.id,
      name: dto.name,
    });

    return UserResponseDto.fromDomain(result);
  }

  @Put('theme')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cambiar tema',
    description: 'Cambia el tema de la interfaz del usuario (light o dark)'
  })
  @ApiBody({ type: ChangeThemeRequestDto })
  @ApiResponse({
    status: 204,
    description: 'Tema cambiado exitosamente'
  })
  @ApiResponse({
    status: 400,
    description: 'Tema inválido'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async changeTheme(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChangeThemeRequestDto,
  ): Promise<void> {
    await this.changeThemeUseCase.execute({
      userId: user.id,
      theme: dto.theme,
    });
  }

  @Put('language')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cambiar idioma',
    description: 'Cambia el idioma de la interfaz del usuario (es o en)'
  })
  @ApiBody({ type: ChangeLanguageRequestDto })
  @ApiResponse({
    status: 204,
    description: 'Idioma cambiado exitosamente'
  })
  @ApiResponse({
    status: 400,
    description: 'Idioma inválido'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async changeLanguage(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChangeLanguageRequestDto,
  ): Promise<void> {
    await this.changeLanguageUseCase.execute({
      userId: user.id,
      language: dto.language,
    });
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir avatar de usuario',
    description: 'Sube una imagen de avatar para el usuario. Tamaño máximo: 5MB. Formatos permitidos: JPEG, PNG, WebP.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPEG, PNG, o WebP)'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar subido exitosamente',
    schema: {
      type: 'object',
      properties: {
        avatarPath: { type: 'string' },
        avatarSize: { type: 'number' },
        avatarMimeType: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido (tamaño, tipo, o contenido)'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async uploadAvatar(
    @Req() request: FastifyRequest & { file: () => Promise<MultipartFile> },
    @CurrentUser() user: JwtUser,
  ) {
    // Fastify multipart - get uploaded file
    const data = await request.file();

    if (!data) {
      throw new BadRequestException('No se subió ningún archivo');
    }

    // Validate file size (5MB max for avatars)
    const MAX_SIZE = 5 * 1024 * 1024;

    // Convert stream to buffer
    const buffer = await data.toBuffer();

    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException('El archivo excede el tamaño máximo de 5MB');
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }

    return await this.uploadAvatarUseCase.execute({
      userId: user.id,
      file: {
        buffer,
        mimetype: data.mimetype,
        size: buffer.length,
        originalname: data.filename || 'avatar',
      },
    });
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar avatar de usuario',
    description: 'Elimina el avatar actual del usuario'
  })
  @ApiResponse({
    status: 204,
    description: 'Avatar eliminado exitosamente'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async deleteAvatar(@CurrentUser() user: JwtUser): Promise<void> {
    await this.deleteAvatarUseCase.execute({
      userId: user.id,
    });
  }

  @Get('privacy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener configuración de privacidad',
    description: 'Obtiene la configuración de privacidad del perfil del usuario actual'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración de privacidad',
    type: PrivacySettingsResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async getPrivacySettings(
    @CurrentUser() user: JwtUser,
  ): Promise<PrivacySettingsResponseDto> {
    const result = await this.updatePrivacySettingsUseCase.execute({
      userId: user.id,
    });
    return PrivacySettingsResponseDto.fromDomain(result);
  }

  @Put('privacy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar configuración de privacidad',
    description: 'Actualiza la configuración de privacidad del perfil público del usuario'
  })
  @ApiBody({ type: UpdatePrivacySettingsRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Configuración de privacidad actualizada',
    type: PrivacySettingsResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async updatePrivacySettings(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePrivacySettingsRequestDto,
  ): Promise<PrivacySettingsResponseDto> {
    const result = await this.updatePrivacySettingsUseCase.execute({
      userId: user.id,
      isPublicProfile: dto.isPublicProfile,
      showTopTracks: dto.showTopTracks,
      showTopArtists: dto.showTopArtists,
      showTopAlbums: dto.showTopAlbums,
      showPlaylists: dto.showPlaylists,
      bio: dto.bio,
    });

    return PrivacySettingsResponseDto.fromDomain(result);
  }

  @Get('home-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener preferencias del home',
    description: 'Obtiene la configuración de secciones del home del usuario actual'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración del home',
    type: HomePreferencesResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async getHomePreferences(
    @CurrentUser() user: JwtUser,
  ): Promise<HomePreferencesResponseDto> {
    const result = await this.updateHomePreferencesUseCase.execute({
      userId: user.id,
    });
    return HomePreferencesResponseDto.fromDomain(result);
  }

  @Put('home-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar preferencias del home',
    description: 'Actualiza la configuración de secciones del home (orden, habilitadas/deshabilitadas)'
  })
  @ApiBody({ type: UpdateHomePreferencesRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Configuración del home actualizada',
    type: HomePreferencesResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async updateHomePreferences(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateHomePreferencesRequestDto,
  ): Promise<HomePreferencesResponseDto> {
    const result = await this.updateHomePreferencesUseCase.execute({
      userId: user.id,
      homeSections: dto.homeSections,
    });

    return HomePreferencesResponseDto.fromDomain(result);
  }
}