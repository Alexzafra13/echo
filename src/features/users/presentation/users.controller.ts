import {
  Controller,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { AllowChangePassword } from '@shared/decorators/allow-change-password.decorator';
import {
  ChangePasswordUseCase,
  UpdateProfileUseCase,
  ChangeThemeUseCase,
  ChangeLanguageUseCase,
} from '../domain/use-cases';
import {
  ChangePasswordRequestDto,
  UpdateProfileRequestDto,
  ChangeThemeRequestDto,
  ChangeLanguageRequestDto,
  UserResponseDto,
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
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordRequestDto,
  ): Promise<void> {
    await this.changePasswordUseCase.execute({
      userId: user.userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar perfil',
    description: 'Actualiza la información del perfil del usuario (nombre y/o email)'
  })
  @ApiBody({ type: UpdateProfileRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: UserResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Email ya registrado o datos inválidos'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileRequestDto,
  ): Promise<UserResponseDto> {
    const result = await this.updateProfileUseCase.execute({
      userId: user.userId,
      name: dto.name,
      email: dto.email,
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
    @CurrentUser() user: any,
    @Body() dto: ChangeThemeRequestDto,
  ): Promise<void> {
    await this.changeThemeUseCase.execute({
      userId: user.userId,
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
    @CurrentUser() user: any,
    @Body() dto: ChangeLanguageRequestDto,
  ): Promise<void> {
    await this.changeLanguageUseCase.execute({
      userId: user.userId,
      language: dto.language,
    });
  }
}