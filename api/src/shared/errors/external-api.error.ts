import { BaseError } from './base.error';

/**
 * Error thrown when an external API request fails.
 * Used for HTTP errors from third-party services like LastFM, Fanart.tv, MusicBrainz, etc.
 */
export class ExternalApiError extends BaseError {
  constructor(
    public readonly provider: string,
    public readonly httpStatus: number,
    public readonly httpStatusText: string,
    public readonly url?: string,
  ) {
    const message = `${provider} API error: HTTP ${httpStatus} ${httpStatusText}`;
    super('EXTERNAL_API_ERROR', message);
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}
