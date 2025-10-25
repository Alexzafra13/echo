import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import {
  CreateUserUseCase,
  ListUsersUseCase,
} from '../domain/use-cases';
import {
  CreateUserRequestDto,
  CreateUserResponseDto,
  ListUsersResponseDto,
} from './dtos';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
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
    description: 'Username o email ya existe'
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos de administrador'
  })
  async createUser(@Body() dto: CreateUserRequestDto) {
    const result = await this.createUserUseCase.execute({
      username: dto.username,
      email: dto.email,
      name: dto.name,
      isAdmin: dto.isAdmin,
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
      take: take ? parseInt(skip, 10) : undefined,
    });

    return ListUsersResponseDto.fromDomain(result);
  }
}