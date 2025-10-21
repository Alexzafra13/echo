import {
  Controller,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { AllowChangePassword } from '@shared/decorators/allow-change-password.decorator';  // ← IMPORTAR
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