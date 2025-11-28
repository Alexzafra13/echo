import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * RadioStreamProxyService - Proxies HTTP radio streams through HTTPS
 *
 * Solves the Mixed Content issue when the app is served over HTTPS
 * but radio streams are only available over HTTP.
 */
@Injectable()
export class RadioStreamProxyService {
  private readonly logger = new Logger(RadioStreamProxyService.name);

  // Allowed audio MIME types
  private readonly allowedMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/aac',
    'audio/aacp',
    'audio/ogg',
    'audio/opus',
    'audio/flac',
    'audio/x-flac',
    'audio/wav',
    'audio/x-wav',
    'application/ogg',
    'application/octet-stream', // Some streams use this
  ];

  /**
   * Validates that the URL is safe to proxy
   */
  validateStreamUrl(streamUrl: string): { valid: boolean; error?: string } {
    try {
      const url = new URL(streamUrl);

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Invalid protocol. Only HTTP/HTTPS allowed.' };
      }

      // Block localhost and private IPs for security
      const hostname = url.hostname.toLowerCase();
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
      if (blockedHosts.includes(hostname)) {
        return { valid: false, error: 'Local addresses are not allowed.' };
      }

      // Block private IP ranges
      const privateIpPatterns = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^169\.254\./,
      ];
      if (privateIpPatterns.some((pattern) => pattern.test(hostname))) {
        return { valid: false, error: 'Private IP addresses are not allowed.' };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format.' };
    }
  }

  /**
   * Creates a proxied stream request
   * Returns the response stream and headers
   */
  createProxyStream(
    streamUrl: string,
    clientHeaders?: Record<string, string>,
  ): Promise<{
    stream: http.IncomingMessage;
    headers: http.IncomingHttpHeaders;
    statusCode: number;
  }> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(streamUrl);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const options: http.RequestOptions = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Echo/1.0 (Radio Stream Proxy)',
            Accept: 'audio/*,*/*;q=0.9',
            'Icy-MetaData': '0', // Don't request ICY metadata for proxy
            ...(clientHeaders?.range && { Range: clientHeaders.range }),
          },
          timeout: 15000,
        };

        this.logger.debug(`Proxying stream: ${streamUrl}`);

        const req = httpModule.request(options, (res) => {
          // Handle redirects
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            this.logger.debug(`Following redirect to: ${res.headers.location}`);
            this.createProxyStream(res.headers.location, clientHeaders)
              .then(resolve)
              .catch(reject);
            return;
          }

          // Validate content type
          const contentType = res.headers['content-type'] || '';
          const isAudioStream = this.allowedMimeTypes.some(
            (type) =>
              contentType.toLowerCase().includes(type) ||
              contentType === '' || // Some streams don't send content-type
              streamUrl.match(/\.(mp3|aac|ogg|opus|flac|wav)(\?|$)/i),
          );

          if (!isAudioStream && res.statusCode === 200) {
            this.logger.warn(`Non-audio content-type received: ${contentType}`);
            // Still allow it - some radio streams use weird content types
          }

          resolve({
            stream: res,
            headers: res.headers,
            statusCode: res.statusCode || 200,
          });
        });

        req.on('error', (error) => {
          this.logger.error(`Stream proxy error: ${error.message}`);
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Connection timeout'));
        });

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
