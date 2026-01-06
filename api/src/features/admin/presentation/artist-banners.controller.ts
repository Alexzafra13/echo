import { Controller, Get, Post, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { ManageArtistBannersUseCase } from '../infrastructure/use-cases/manage-artist-banners';

interface AddBannerDto {
  artistId: string;
  bannerUrl: string;
  provider: string;
}

@ApiTags('Admin - Artist Banners')
@ApiBearerAuth()
@Controller('admin/metadata/artist')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ArtistBannersManagementController {
  constructor(private readonly manageBanners: ManageArtistBannersUseCase) {}

  @Get(':artistId/banners')
  @ApiOperation({ summary: 'List all banners for an artist' })
  async listBanners(@Param('artistId', ParseUUIDPipe) artistId: string) {
    return this.manageBanners.list({ artistId });
  }

  @Post('banners/add')
  @ApiOperation({ summary: 'Add a new banner to an artist (accumulates)' })
  async addBanner(@Body() body: AddBannerDto) {
    return this.manageBanners.add(body);
  }

  @Delete('banners/:bannerId')
  @ApiOperation({ summary: 'Delete a banner' })
  async deleteBanner(@Param('bannerId', ParseUUIDPipe) bannerId: string) {
    return this.manageBanners.delete({ bannerId });
  }
}
