/**
 * Album Cover Entity
 * Represents album cover art in multiple sizes
 */
export class AlbumCover {
  constructor(
    /**
     * Small cover URL (250px)
     */
    public readonly smallUrl: string,

    /**
     * Medium cover URL (500px)
     */
    public readonly mediumUrl: string,

    /**
     * Large cover URL (1200px+)
     */
    public readonly largeUrl: string,

    /**
     * Source agent name
     * @example 'coverartarchive', 'lastfm'
     */
    public readonly source: string
  ) {}

  /**
   * Get URL for specific size
   * @param size Desired size: 'small' | 'medium' | 'large'
   */
  getUrlForSize(size: 'small' | 'medium' | 'large'): string {
    switch (size) {
      case 'small':
        return this.smallUrl;
      case 'medium':
        return this.mediumUrl;
      case 'large':
        return this.largeUrl;
      default:
        return this.largeUrl;
    }
  }

  /**
   * Get all URLs as array
   */
  getAllUrls(): string[] {
    return [this.smallUrl, this.mediumUrl, this.largeUrl];
  }
}
