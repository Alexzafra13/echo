import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@infrastructure/database/schema';
import { FederationTokenService } from '../domain/services';
import { IFederationRepository, FEDERATION_REPOSITORY } from '../domain/ports/federation.repository';
import {
  CreateInvitationTokenDto,
  InvitationTokenResponseDto,
} from './dto';

// Creación de tokens de invitación para que otros conecten a tu servidor
@ApiTags('federation')
@Controller('federation/invitations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvitationController {
  constructor(
    @InjectPinoLogger(InvitationController.name)
    private readonly logger: PinoLogger,
    private readonly tokenService: FederationTokenService,
    @Inject(FEDERATION_REPOSITORY)
    private readonly repository: IFederationRepository,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear token de invitación',
    description: 'Crea un token que otros pueden usar para conectarse a tu servidor',
  })
  @ApiResponse({
    status: 201,
    description: 'Token creado exitosamente',
    type: InvitationTokenResponseDto,
  })
  async createInvitationToken(
    @CurrentUser() user: User,
    @Body() dto: CreateInvitationTokenDto,
  ): Promise<InvitationTokenResponseDto> {
    const token = await this.tokenService.generateInvitationToken(
      user.id,
      dto.name,
      dto.expiresInDays,
      dto.maxUses,
    );

    this.logger.info({ userId: user.id, tokenId: token.id }, 'Invitation token created');

    return {
      id: token.id,
      token: token.token,
      name: token.name ?? undefined,
      expiresAt: token.expiresAt,
      maxUses: token.maxUses,
      currentUses: token.currentUses,
      isUsed: token.isUsed,
      createdAt: token.createdAt,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Listar tokens de invitación',
    description: 'Obtiene todos los tokens de invitación creados por el usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tokens',
    type: [InvitationTokenResponseDto],
  })
  async getInvitationTokens(
    @CurrentUser() user: User,
  ): Promise<InvitationTokenResponseDto[]> {
    const tokens = await this.tokenService.getUserInvitationTokens(user.id);

    return tokens.map((token) => ({
      id: token.id,
      token: token.token,
      name: token.name ?? undefined,
      expiresAt: token.expiresAt,
      maxUses: token.maxUses,
      currentUses: token.currentUses,
      isUsed: token.isUsed,
      createdAt: token.createdAt,
    }));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar token de invitación',
  })
  @ApiParam({ name: 'id', description: 'ID del token' })
  @ApiResponse({ status: 204, description: 'Token eliminado' })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin acceso al token' })
  async deleteInvitationToken(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const token = await this.repository.findFederationTokenById(id);
    if (!token) {
      throw new NotFoundException('Token de invitación no encontrado');
    }
    if (token.createdByUserId !== user.id) {
      throw new ForbiddenException('No tienes acceso a este token');
    }
    await this.tokenService.deleteInvitationToken(id);
    this.logger.info({ userId: user.id, tokenId: id }, 'Invitation token deleted');
  }
}
