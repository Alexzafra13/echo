/**
 * Similar Artist Entity
 * Represents an artist similar to another (from Last.fm)
 */
export class SimilarArtist {
  constructor(
    /**
     * Artist name
     */
    public readonly name: string,

    /**
     * URL to Last.fm artist page
     */
    public readonly url: string | null,

    /**
     * Artist image URL (if available)
     */
    public readonly imageUrl: string | null,

    /**
     * Match percentage (0-100) - how similar this artist is
     * Note: Last.fm doesn't always provide this in artist.getinfo
     */
    public readonly match: number | null = null
  ) {}
}
