/**
 * Artist Images Entity
 * Represents all types of images for an artist
 */
export class ArtistImages {
  constructor(
    /**
     * Small image URL (typically square, ~250px)
     */
    public readonly smallUrl: string | null,

    /**
     * Medium image URL (typically square, ~500px)
     */
    public readonly mediumUrl: string | null,

    /**
     * Large image URL (typically square, ~1000px+)
     */
    public readonly largeUrl: string | null,

    /**
     * Background image URL (HD, for Hero sections)
     * @example Fanart.tv artistbackground (1920x1080)
     */
    public readonly backgroundUrl: string | null,

    /**
     * Banner image URL (wide format, for headers)
     * @example Fanart.tv musicbanner (1000x185)
     */
    public readonly bannerUrl: string | null,

    /**
     * Logo image URL (transparent PNG, for overlays)
     * @example Fanart.tv hdmusiclogo
     */
    public readonly logoUrl: string | null,

    /**
     * Source agent name
     * @example 'lastfm', 'fanart'
     */
    public readonly source: string
  ) {}

  /**
   * Check if any image URL is available
   */
  hasAnyImage(): boolean {
    return !!(
      this.smallUrl ||
      this.mediumUrl ||
      this.largeUrl ||
      this.backgroundUrl ||
      this.bannerUrl ||
      this.logoUrl
    );
  }

  /**
   * Check if basic profile images are available
   */
  hasProfileImages(): boolean {
    return !!(this.smallUrl || this.mediumUrl || this.largeUrl);
  }

  /**
   * Check if hero/banner assets are available
   */
  hasHeroAssets(): boolean {
    return !!(this.backgroundUrl || this.bannerUrl);
  }

  /**
   * Get best available profile image URL
   */
  getBestProfileUrl(): string | null {
    return this.largeUrl || this.mediumUrl || this.smallUrl || null;
  }

  /**
   * Get image count
   */
  getImageCount(): number {
    let count = 0;
    if (this.smallUrl) count++;
    if (this.mediumUrl) count++;
    if (this.largeUrl) count++;
    if (this.backgroundUrl) count++;
    if (this.bannerUrl) count++;
    if (this.logoUrl) count++;
    return count;
  }
}
