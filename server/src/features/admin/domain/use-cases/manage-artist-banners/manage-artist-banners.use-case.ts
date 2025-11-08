import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  ListArtistBannersInput,
  ListArtistBannersOutput,
  AddArtistBannerInput,
  AddArtistBannerOutput,
  DeleteArtistBannerInput,
  DeleteArtistBannerOutput,
} from './manage-artist-banners.dto';

@Injectable()
export class ManageArtistBannersUseCase {
  private readonly logger = new Logger(ManageArtistBannersUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
  ) {}

  async list(input: ListArtistBannersInput): Promise<ListArtistBannersOutput> {
    const banners = await this.prisma.artistBanner.findMany({
      where: { artistId: input.artistId },
      orderBy: { order: 'asc' },
    });

    return {
      banners: banners.map((b) => ({
        id: b.id,
        artistId: b.artistId,
        imageUrl: b.imageUrl,
        provider: b.provider,
        order: b.order,
        createdAt: b.createdAt,
      })),
    };
  }

  async add(input: AddArtistBannerInput): Promise<AddArtistBannerOutput> {
    const artist = await this.prisma.artist.findUnique({
      where: { id: input.artistId },
    });

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    // Get current max order
    const maxOrder = await this.prisma.artistBanner.findFirst({
      where: { artistId: input.artistId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = (maxOrder?.order ?? -1) + 1;

    // Download banner
    const basePath = await this.storage.getArtistMetadataPath(input.artistId);
    const filename = `banner-${Date.now()}.png`;
    const imagePath = path.join(basePath, filename);

    await this.imageDownload.downloadAndSave(input.bannerUrl, imagePath);

    // Create banner record
    const banner = await this.prisma.artistBanner.create({
      data: {
        artistId: input.artistId,
        imageUrl: imagePath,
        provider: input.provider,
        order: newOrder,
      },
    });

    this.logger.log(`Added banner for artist ${artist.name} from ${input.provider}`);

    return {
      success: true,
      message: 'Banner added successfully',
      bannerId: banner.id,
    };
  }

  async delete(input: DeleteArtistBannerInput): Promise<DeleteArtistBannerOutput> {
    const banner = await this.prisma.artistBanner.findUnique({
      where: { id: input.bannerId },
    });

    if (!banner) {
      throw new NotFoundException(`Banner not found: ${input.bannerId}`);
    }

    // Delete physical file
    try {
      await fs.unlink(banner.imageUrl);
    } catch (error) {
      this.logger.warn(`Failed to delete banner file: ${(error as Error).message}`);
    }

    // Delete database record
    await this.prisma.artistBanner.delete({
      where: { id: input.bannerId },
    });

    this.logger.log(`Deleted banner ${input.bannerId}`);

    return {
      success: true,
      message: 'Banner deleted successfully',
    };
  }
}
