import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { CurrentUser } from '@shared/decorators';
import { JwtUser } from '@shared/types/request.types';
import {
  CreateUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  ResetUserPasswordUseCase,
  PermanentlyDeleteUserUseCase,
} from '../domain/use-cases';
import {
  CreateUserRequestDto,
  CreateUserResponseDto,
  ListUsersResponseDto,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
  ResetPasswordResponseDto,
} from './dtos';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly resetUserPasswordUseCase: ResetUserPasswordUseCase,
    private readonly permanentlyDeleteUserUseCase: PermanentlyDeleteUserUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear usuario (Admin)',
    description: 'Crea un nuevo usuario en el sistema. Solo accesible por administradores. El usuario creado debe cambiar su contraseña en el primer login.'
  })
  @ApiBody({ type: CreateUserRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: CreateUserResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Username ya existe'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador'
  })
  async createUser(
    @Body() dto: CreateUserRequestDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    const result = await this.createUserUseCase.execute({
      username: dto.username,
      name: dto.name,
      isAdmin: dto.isAdmin,
      adminId: currentUser?.id,
    });

    return CreateUserResponseDto.fromDomain(result);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar usuarios (Admin)',
    description: 'Retorna una lista paginada de todos los usuarios del sistema con su información y estado. Solo accesible por administradores.'
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de usuarios a omitir (para paginación)',
    example: 0
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de usuarios a retornar',
    example: 20
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
    type: ListUsersResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador'
  })
  async listUsers(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ListUsersResponseDto> {
    const result = await this.listUsersUseCase.execute({
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });

    return ListUsersResponseDto.fromDomain(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar usuario (Admin)',
    description: 'Actualiza la información de un usuario existente. Permite cambiar nombre, rol de admin y estado activo. Solo accesible por administradores.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del usuario a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({ type: UpdateUserRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: UpdateUserResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador'
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado'
  })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRequestDto,
  ): Promise<UpdateUserResponseDto> {
    const result = await this.updateUserUseCase.execute({
      userId: id,
      name: dto.name,
      isAdmin: dto.isAdmin,
      isActive: dto.isActive,
    });

    return UpdateUserResponseDto.fromDomain(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desactivar usuario (Admin)',
    description: 'Desactiva una cuenta de usuario (soft delete). El usuario ya no podrá iniciar sesión. No se puede eliminar el último administrador. Solo accesible por administradores.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del usuario a desactivar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 204,
    description: 'Usuario desactivado exitosamente'
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar el último administrador'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador'
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado'
  })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtUser,
  ): Promise<void> {
    await this.deleteUserUseCase.execute({
      userId: id,
      adminId: currentUser?.id,
    });
  }

  @Delete(':id/permanently')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar usuario permanentemente (Admin)',
    description: 'Elimina permanentemente una cuenta de usuario (hard delete). Esta acción es IRREVERSIBLE. No se puede eliminar el último administrador activo. Solo accesible por administradores.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del usuario a eliminar permanentemente',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 204,
    description: 'Usuario eliminado permanentemente'
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar el último administrador activo'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador'
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado'
  })
  async permanentlyDeleteUser(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.permanentlyDeleteUserUseCase.execute({ userId: id });
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resetear contraseña de usuario (Admin)',
    description: 'Genera una nueva contraseña temporal para el usuario. El usuario deberá cambiarla en su próximo login. Solo accesible por administradores.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña reseteada exitosamente. La nueva contraseña temporal debe ser comunicada al usuario.',
    type: ResetPasswordResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador'
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado'
  })
  async resetUserPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtUser,
  ): Promise<ResetPasswordResponseDto> {
    const result = await this.resetUserPasswordUseCase.execute({
      userId: id,
      adminId: currentUser?.id,
    });
    return ResetPasswordResponseDto.fromDomain(result);
  }
}