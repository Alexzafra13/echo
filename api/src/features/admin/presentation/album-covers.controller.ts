import { Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { SearchAlbumCoversUseCase } from '../infrastructure/use-cases/search-album-covers';
import { ApplyAlbumCoverUseCase } from '../infrastructure/use-cases/apply-album-cover';
import { SearchAlbumCoversResponseDto } from './dtos/search-album-covers.response.dto';
import { ApplyAlbumCoverRequestDto } from './dtos/apply-album-cover.request.dto';
import { ApplyAlbumCoverResponseDto } from './dtos/apply-album-cover.response.dto';

@ApiTags('Admin - Album Covers')
@ApiBearerAuth()
@Controller('admin/metadata/album')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AlbumCoversController {
  constructor(
    private readonly searchAlbumCovers: SearchAlbumCoversUseCase,
    private readonly applyAlbumCover: ApplyAlbumCoverUseCase,
  ) {}

  @Get(':albumId/covers/search')
  @ApiOperation({
    summary: 'Search album covers from all providers',
    description:
      'Queries all available metadata providers for album cover options',
  })
  async searchCovers(
    @Param('albumId', ParseUUIDPipe) albumId: string,
  ): Promise<SearchAlbumCoversResponseDto> {
    const result = await this.searchAlbumCovers.execute({ albumId });
    return SearchAlbumCoversResponseDto.fromDomain(result);
  }

  @Post('covers/apply')
  @ApiOperation({
    summary: 'Apply selected album cover',
    description:
      'Downloads and applies a selected cover, replacing the existing one',
  })
  async applyCover(
    @Body() body: ApplyAlbumCoverRequestDto,
  ): Promise<ApplyAlbumCoverResponseDto> {
    const result = await this.applyAlbumCover.execute({
      albumId: body.albumId,
      coverUrl: body.coverUrl,
      provider: body.provider,
    });
    return ApplyAlbumCoverResponseDto.fromDomain(result);
  }
}
