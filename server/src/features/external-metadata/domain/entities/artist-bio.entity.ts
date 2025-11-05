/**
 * Artist Biography Entity
 * Represents biographical information about an artist
 */
export class ArtistBio {
  constructor(
    /**
     * Full biography content (can include HTML)
     */
    public readonly content: string,

    /**
     * Short summary/excerpt (optional)
     */
    public readonly summary: string | null,

    /**
     * URL to full biography on external service
     */
    public readonly url: string | null,

    /**
     * Source agent name
     * @example 'lastfm', 'wikipedia'
     */
    public readonly source: string
  ) {}

  /**
   * Check if biography has meaningful content
   */
  hasContent(): boolean {
    return this.content && this.content.trim().length > 0;
  }

  /**
   * Get plain text version (strip HTML if present)
   */
  getPlainText(): string {
    return this.content.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Get character count
   */
  getLength(): number {
    return this.getPlainText().length;
  }
}
