import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { radioStationImages } from '@infrastructure/database/schema';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { fetchWithTimeout } from '@shared/utils';

export interface FetchFaviconResult {
  success: boolean;
  source?: string;
  url?: string;
}

/**
 * RadioFaviconFetchService
 * Automatically fetches favicon images from external sources:
 * 1. apple-touch-icon from station homepage
 * 2. Google Favicon API
 * 3. Wikipedia API (for well-known stations)
 */
@Injectable()
export class RadioFaviconFetchService {
  private readonly USER_AGENT = 'Echo/1.0 (Music Server; +https://github.com/echo)';

  constructor(
    @InjectPinoLogger(RadioFaviconFetchService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService
  ) {}

  /**
   * Try to auto-fetch a favicon for a station from external sources.
   * Returns true if a favicon was successfully fetched and saved.
   */
  async fetchAndSave(
    stationUuid: string,
    stationName: string,
    homepage?: string
  ): Promise<FetchFaviconResult> {
    // Check if we already have a custom image for this station
    const existing = await this.drizzle.db
      .select({ id: radioStationImages.id })
      .from(radioStationImages)
      .where(eq(radioStationImages.stationUuid, stationUuid))
      .limit(1);

    if (existing[0]) {
      return { success: false };
    }

    // Try sources in priority order
    let imageBuffer: Buffer | null = null;
    let mimeType = 'image/png';
    let source = '';

    // 1. Try apple-touch-icon from homepage
    if (homepage) {
      const result = await this.tryAppleTouchIcon(homepage);
      if (result) {
        imageBuffer = result.buffer;
        mimeType = result.mimeType;
        source = 'apple-touch-icon';
      }
    }

    // 2. Try Google Favicon API
    if (!imageBuffer && homepage) {
      const result = await this.tryGoogleFavicon(homepage);
      if (result) {
        imageBuffer = result.buffer;
        mimeType = result.mimeType;
        source = 'google-favicon';
      }
    }

    // 3. Try Wikipedia
    if (!imageBuffer) {
      const result = await this.tryWikipedia(stationName);
      if (result) {
        imageBuffer = result.buffer;
        mimeType = result.mimeType;
        source = 'wikipedia';
      }
    }

    if (!imageBuffer) {
      return { success: false };
    }

    // Minimum size check (skip tiny/placeholder images)
    if (imageBuffer.length < 500) {
      this.logger.debug(`Skipping tiny image (${imageBuffer.length} bytes) for ${stationName}`);
      return { success: false };
    }

    // Save to storage
    try {
      const extension =
        mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';

      const filePath = await this.storage.getRadioFaviconPath(stationUuid, extension);
      await this.storage.saveImage(filePath, imageBuffer);

      // Save to database
      await this.drizzle.db.insert(radioStationImages).values({
        stationUuid,
        filePath,
        fileName: `favicon.${extension}`,
        fileSize: imageBuffer.length,
        mimeType,
        source,
      });

      this.imageService.invalidateRadioFaviconCache(stationUuid);

      this.logger.info(
        `Auto-fetched favicon for "${stationName}" from ${source} (${imageBuffer.length} bytes)`
      );

      return {
        success: true,
        source,
        url: `/api/images/radio/${stationUuid}/favicon`,
      };
    } catch (error) {
      this.logger.error(`Failed to save auto-fetched favicon: ${(error as Error).message}`);
      return { success: false };
    }
  }

  /**
   * Try to get apple-touch-icon from a homepage URL
   */
  private async tryAppleTouchIcon(
    homepage: string
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const url = new URL(homepage);
      const baseUrl = `${url.protocol}//${url.host}`;

      // Try common apple-touch-icon paths
      const iconPaths = [
        '/apple-touch-icon.png',
        '/apple-touch-icon-precomposed.png',
        '/apple-touch-icon-180x180.png',
        '/apple-touch-icon-152x152.png',
      ];

      for (const iconPath of iconPaths) {
        try {
          const response = await fetchWithTimeout(`${baseUrl}${iconPath}`, {
            timeout: 5000,
            headers: { 'User-Agent': this.USER_AGENT },
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('image')) {
              const buffer = Buffer.from(await response.arrayBuffer());
              if (buffer.length > 500) {
                return {
                  buffer,
                  mimeType: contentType.includes('png') ? 'image/png' : 'image/jpeg',
                };
              }
            }
          }
        } catch {
          // Try next path
        }
      }

      // Try parsing HTML for <link rel="apple-touch-icon">
      try {
        const response = await fetchWithTimeout(baseUrl, {
          timeout: 5000,
          headers: { 'User-Agent': this.USER_AGENT },
        });

        if (response.ok) {
          const html = await response.text();
          const iconUrl = this.extractAppleTouchIconFromHtml(html, baseUrl);
          if (iconUrl) {
            const iconResponse = await fetchWithTimeout(iconUrl, {
              timeout: 5000,
              headers: { 'User-Agent': this.USER_AGENT },
            });
            if (iconResponse.ok) {
              const contentType = iconResponse.headers.get('content-type') || '';
              if (contentType.includes('image')) {
                const buffer = Buffer.from(await iconResponse.arrayBuffer());
                if (buffer.length > 500) {
                  return {
                    buffer,
                    mimeType: contentType.includes('png') ? 'image/png' : 'image/jpeg',
                  };
                }
              }
            }
          }
        }
      } catch {
        // Ignore
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract apple-touch-icon URL from HTML
   */
  private extractAppleTouchIconFromHtml(html: string, baseUrl: string): string | null {
    // Match <link rel="apple-touch-icon" href="...">
    const match = html.match(
      /<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["'][^>]*>/i
    );

    if (!match?.[1]) return null;

    const href = match[1];
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    if (href.startsWith('/')) return `${baseUrl}${href}`;
    return `${baseUrl}/${href}`;
  }

  /**
   * Try Google Favicon API (128px)
   */
  private async tryGoogleFavicon(
    homepage: string
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      const url = new URL(homepage);
      const domain = url.hostname;

      const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

      const response = await fetchWithTimeout(googleUrl, {
        timeout: 5000,
        headers: { 'User-Agent': this.USER_AGENT },
      });

      if (!response.ok) return null;

      const buffer = Buffer.from(await response.arrayBuffer());

      // Google returns a generic globe icon (~726 bytes PNG) for sites without favicon
      // Skip images that are too small (likely placeholders)
      if (buffer.length < 1000) return null;

      const contentType = response.headers.get('content-type') || 'image/png';

      return {
        buffer,
        mimeType: contentType.includes('png')
          ? 'image/png'
          : contentType.includes('jpeg') || contentType.includes('jpg')
            ? 'image/jpeg'
            : 'image/png',
      };
    } catch {
      return null;
    }
  }

  /**
   * Try Wikipedia API to find station logo
   */
  private async tryWikipedia(
    stationName: string
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    try {
      // Search Wikipedia for the station
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(stationName + ' radio station')}&gsrlimit=3&prop=pageimages&pithumbsize=300&format=json`;

      const response = await fetchWithTimeout(searchUrl, {
        timeout: 8000,
        headers: { 'User-Agent': `${this.USER_AGENT} (Echo Music Server)` },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string;
              thumbnail?: { source: string; width: number; height: number };
            }
          >;
        };
      };

      if (!data.query?.pages) return null;

      // Find the first page with a thumbnail
      for (const page of Object.values(data.query.pages)) {
        if (page.thumbnail?.source) {
          // Verify it's somewhat relevant (title should contain part of station name)
          const nameWords = stationName
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2);
          const titleLower = (page.title || '').toLowerCase();
          const hasMatch = nameWords.some((word) => titleLower.includes(word));

          if (!hasMatch) continue;

          // Download the thumbnail
          const imgResponse = await fetchWithTimeout(page.thumbnail.source, {
            timeout: 5000,
            headers: { 'User-Agent': `${this.USER_AGENT} (Echo Music Server)` },
          });

          if (imgResponse.ok) {
            const buffer = Buffer.from(await imgResponse.arrayBuffer());
            if (buffer.length > 1000) {
              const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
              return {
                buffer,
                mimeType: contentType.includes('png')
                  ? 'image/png'
                  : contentType.includes('webp')
                    ? 'image/webp'
                    : 'image/jpeg',
              };
            }
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Batch fetch favicons for multiple stations
   */
  async batchFetch(
    stations: Array<{ stationUuid: string; name: string; homepage?: string }>
  ): Promise<{ fetched: number; total: number }> {
    let fetched = 0;

    for (const station of stations) {
      try {
        const result = await this.fetchAndSave(station.stationUuid, station.name, station.homepage);
        if (result.success) fetched++;

        // Small delay between requests to be polite
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(
          `Failed to fetch favicon for ${station.name}: ${(error as Error).message}`
        );
      }
    }

    return { fetched, total: stations.length };
  }
}
