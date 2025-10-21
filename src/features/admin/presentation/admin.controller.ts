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

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
}