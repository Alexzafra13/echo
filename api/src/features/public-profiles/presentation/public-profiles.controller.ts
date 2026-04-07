import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { JwtUser } from '@shared/types/request.types';
import { GetPublicProfileUseCase } from '../domain/use-cases/get-public-profile';
import { PublicProfileResponseDto } from './dtos';

@ApiTags('profiles')
@ApiBearerAuth('JWT-auth')
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class PublicProfilesController {
  constructor(
    private readonly getPublicProfileUseCase: GetPublicProfileUseCase,
  ) {}

  @Get(':userId')
  @ApiOperation({
    summary: 'Obtener perfil público de un usuario',
    description: 'Obtiene el perfil público de un usuario. Si el perfil es privado, solo devuelve información básica.',
  })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Perfil del usuario',
    type: PublicProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  async getPublicProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: JwtUser,
  ): Promise<PublicProfileResponseDto> {
    const result = await this.getPublicProfileUseCase.execute({
      userId,
      requesterId: currentUser.id,
    });

    return PublicProfileResponseDto.fromDomain(result);
  }
}
