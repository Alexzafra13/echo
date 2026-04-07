import { Injectable} from '@nestjs/common';

import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
/**
 * Rate Limiter Service
 * Implements token bucket algorithm for respecting external API rate limits
 *
 * Design Pattern: Token Bucket Algorithm
 * Purpose: Ensure compliance with external API rate limits (e.g., MusicBrainz: 1 req/sec)
 */
@Injectable()
export class RateLimiterService {
  constructor(
    @InjectPinoLogger(RateLimiterService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Map of service name to last request timestamp
  private readonly lastRequestTime = new Map<string, number>();

  // Map of service name to minimum delay in milliseconds
  private readonly minDelays = new Map<string, number>([
    ['musicbrainz', 1000], // 1 request per second
    ['coverart', 1000], // Cover Art Archive uses same infra as MusicBrainz
    ['lastfm', 200], // 5 requests per second
    ['fanart', 250], // 4 requests per second (conservative)
  ]);

  /**
   * Wait if necessary to respect rate limit for a service
   * @param serviceName The name of the service (lowercase)
   */
  async waitForRateLimit(serviceName: string): Promise<void> {
    const minDelay = this.minDelays.get(serviceName.toLowerCase()) || 1000;
    const lastRequest = this.lastRequestTime.get(serviceName) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      this.logger.debug(
        `Rate limiting ${serviceName}: waiting ${waitTime}ms before next request`
      );
      await this.sleep(waitTime);
    }

    this.lastRequestTime.set(serviceName, Date.now());
  }

  /**
   * Set custom rate limit for a service
   * @param serviceName The name of the service
   * @param requestsPerSecond Number of requests allowed per second
   */
  setRateLimit(serviceName: string, requestsPerSecond: number): void {
    const minDelay = Math.ceil(1000 / requestsPerSecond);
    this.minDelays.set(serviceName.toLowerCase(), minDelay);
    this.logger.info(
      `Set rate limit for ${serviceName}: ${requestsPerSecond} req/s (${minDelay}ms delay)`
    );
  }

  /**
   * Get the configured rate limit for a service
   * @param serviceName The name of the service
   * @returns The minimum delay in milliseconds
   */
  getRateLimit(serviceName: string): number {
    return this.minDelays.get(serviceName.toLowerCase()) || 1000;
  }

  /**
   * Reset rate limiter for a specific service
   * Useful for testing or when switching API keys
   * @param serviceName The name of the service
   */
  reset(serviceName: string): void {
    this.lastRequestTime.delete(serviceName);
    this.logger.debug(`Reset rate limiter for ${serviceName}`);
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.lastRequestTime.clear();
    this.logger.info('Reset all rate limiters');
  }

  /**
   * Get statistics about rate limiting
   * @returns Object with rate limit statistics
   */
  getStats(): {
    services: Array<{
      name: string;
      minDelayMs: number;
      requestsPerSecond: number;
      lastRequestAgo: number | null;
    }>;
  } {
    const now = Date.now();
    const services = Array.from(this.minDelays.entries()).map(([name, minDelay]) => {
      const lastRequest = this.lastRequestTime.get(name);
      return {
        name,
        minDelayMs: minDelay,
        requestsPerSecond: Math.floor(1000 / minDelay),
        lastRequestAgo: lastRequest ? now - lastRequest : null,
      };
    });

    return { services };
  }

  /**
   * Sleep for a specified duration
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
