import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { SearchArtistAvatarsUseCase } from '../infrastructure/use-cases/search-artist-avatars';
import { ApplyArtistAvatarUseCase } from '../infrastructure/use-cases/apply-artist-avatar';
import { UpdateArtistBackgroundPositionUseCase } from '../infrastructure/use-cases/update-artist-background-position';
import { SearchArtistAvatarsResponseDto } from './dtos/search-artist-avatars.response.dto';
import { ApplyArtistAvatarRequestDto } from './dtos/apply-artist-avatar.request.dto';
import { ApplyArtistAvatarResponseDto } from './dtos/apply-artist-avatar.response.dto';
import { UpdateArtistBackgroundPositionRequestDto } from './dtos/update-artist-background-position.request.dto';
import { UpdateArtistBackgroundPositionResponseDto } from './dtos/update-artist-background-position.response.dto';

@ApiTags('Admin - Artist Avatars')
@ApiBearerAuth()
@Controller('admin/metadata/artist')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ArtistAvatarsController {
  constructor(
    private readonly searchArtistAvatars: SearchArtistAvatarsUseCase,
    private readonly applyArtistAvatar: ApplyArtistAvatarUseCase,
    private readonly updateArtistBackgroundPosition: UpdateArtistBackgroundPositionUseCase,
  ) {}

  @Get(':artistId/avatars/search')
  @ApiOperation({
    summary: 'Search artist images from all providers',
    description:
      'Queries all available metadata providers for artist image options (profile, background, banner, logo)',
  })
  async searchAvatars(
    @Param('artistId', ParseUUIDPipe) artistId: string,
  ): Promise<SearchArtistAvatarsResponseDto> {
    const result = await this.searchArtistAvatars.execute({ artistId });
    return SearchArtistAvatarsResponseDto.fromDomain(result);
  }

  @Post('avatars/apply')
  @ApiOperation({
    summary: 'Apply selected artist image',
    description:
      'Downloads and applies a selected image (profile/background/banner/logo), replacing the existing one',
  })
  async applyAvatar(
    @Body() body: ApplyArtistAvatarRequestDto,
  ): Promise<ApplyArtistAvatarResponseDto> {
    const result = await this.applyArtistAvatar.execute({
      artistId: body.artistId,
      avatarUrl: body.avatarUrl,
      provider: body.provider,
      type: body.type,
    });
    return ApplyArtistAvatarResponseDto.fromDomain(result);
  }

  @Patch('background-position')
  @ApiOperation({
    summary: 'Update artist background position',
    description:
      'Updates the CSS background-position for an artist background image',
  })
  async updateBackgroundPosition(
    @Body() body: UpdateArtistBackgroundPositionRequestDto,
  ): Promise<UpdateArtistBackgroundPositionResponseDto> {
    const result = await this.updateArtistBackgroundPosition.execute({
      artistId: body.artistId,
      backgroundPosition: body.backgroundPosition,
    });
    return UpdateArtistBackgroundPositionResponseDto.fromDomain(result);
  }
}
