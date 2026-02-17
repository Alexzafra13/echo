import { Controller, Post, Get, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StreamTokenService } from '../infrastructure/services/stream-token.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { JwtUser } from '@shared/types/request.types';

@ApiTags('streaming')
@ApiBearerAuth('JWT-auth')
@Controller('stream-token')
@UseGuards(JwtAuthGuard)
export class StreamTokenController {
  constructor(private readonly streamTokenService: StreamTokenService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate stream token',
    description: 'Generates a new stream token for audio streaming. Token expires in 30 days.',
  })
  @ApiResponse({
    status: 200,
    description: 'Stream token generated successfully',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'a1b2c3d4e5f6...' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async generateToken(@CurrentUser() user: JwtUser) {
    const { token, expiresAt } = await this.streamTokenService.generateToken(user.id);
    return { token, expiresAt };
  }

  @Get()
  @ApiOperation({
    summary: 'Get current stream token',
    description: 'Returns the current active stream token if it exists',
  })
  @ApiResponse({
    status: 200,
    description: 'Current stream token',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'a1b2c3d4e5f6...' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No active token found',
  })
  async getCurrentToken(@CurrentUser() user: JwtUser) {
    const tokenData = await this.streamTokenService.getUserToken(user.id);
    if (!tokenData) {
      return this.streamTokenService.generateToken(user.id);
    }
    return tokenData;
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke stream token',
    description: 'Revokes the current stream token. A new one must be generated to stream audio.',
  })
  @ApiResponse({
    status: 204,
    description: 'Token revoked successfully',
  })
  async revokeToken(@CurrentUser() user: JwtUser) {
    await this.streamTokenService.revokeToken(user.id);
  }
}
