import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, artistBanners } from '@infrastructure/database/schema';
import { eq, asc, desc } from 'drizzle-orm';
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
    private readonly drizzle: DrizzleService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
  ) {}

  async list(input: ListArtistBannersInput): Promise<ListArtistBannersOutput> {
    const banners = await this.drizzle.db
      .select()
      .from(artistBanners)
      .where(eq(artistBanners.artistId, input.artistId))
      .orderBy(asc(artistBanners.order));

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
    const artistResult = await this.drizzle.db
      .select()
      .from(artists)
      .where(eq(artists.id, input.artistId))
      .limit(1);

    const artist = artistResult[0];

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    // Get current max order
    const maxOrderResult = await this.drizzle.db
      .select({ order: artistBanners.order })
      .from(artistBanners)
      .where(eq(artistBanners.artistId, input.artistId))
      .orderBy(desc(artistBanners.order))
      .limit(1);

    const maxOrder = maxOrderResult[0];
    const newOrder = (maxOrder?.order ?? -1) + 1;

    // Download banner
    const basePath = await this.storage.getArtistMetadataPath(input.artistId);
    const filename = `banner-${Date.now()}.png`;
    const imagePath = path.join(basePath, filename);

    await this.imageDownload.downloadAndSave(input.bannerUrl, imagePath);

    // Create banner record
    const bannerResult = await this.drizzle.db
      .insert(artistBanners)
      .values({
        artistId: input.artistId,
        imageUrl: imagePath,
        provider: input.provider,
        order: newOrder,
      })
      .returning();

    const banner = bannerResult[0];

    this.logger.log(`Added banner for artist ${artist.name} from ${input.provider}`);

    return {
      success: true,
      message: 'Banner added successfully',
      bannerId: banner.id,
    };
  }

  async delete(input: DeleteArtistBannerInput): Promise<DeleteArtistBannerOutput> {
    const bannerResult = await this.drizzle.db
      .select()
      .from(artistBanners)
      .where(eq(artistBanners.id, input.bannerId))
      .limit(1);

    const banner = bannerResult[0];

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
    await this.drizzle.db
      .delete(artistBanners)
      .where(eq(artistBanners.id, input.bannerId));

    this.logger.log(`Deleted banner ${input.bannerId}`);

    return {
      success: true,
      message: 'Banner deleted successfully',
    };
  }
}
