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
     * MusicBrainz ID (for fetching images from Fanart.tv)
     */
    public readonly mbid: string | null = null,

    /**
     * Match score (0-1) - how similar this artist is
     */
    public readonly match: number | null = null
  ) {}
}
