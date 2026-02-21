import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { EventEmitter } from 'events';
import { Parser as IcecastParser } from 'icecast-parser';

export interface RadioMetadata {
  stationUuid: string;
  title?: string;
  artist?: string;
  song?: string;
  timestamp: number;
}

// Parsea metadata ICY de streams de radio para obtener la canción actual
@Injectable()
export class IcyMetadataService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectPinoLogger(IcyMetadataService.name)
    private readonly logger: PinoLogger
  ) {}

  private activeStreams = new Map<string, IcecastParser>();
  private streamListeners = new Map<string, Set<EventEmitter>>();

  // Captura errores no manejados de icecast-parser para evitar crash del servidor
  private readonly uncaughtErrorHandler = (error: Error) => {
    const isIcecastError =
      error.stack?.includes('icecast-parser') ||
      error.stack?.includes('Parser.onRequestError') ||
      error.stack?.includes('Parser.js');

    if (isIcecastError) {
      this.logger.error(
        `[SAFETY NET] Caught unhandled icecast-parser error: ${error.message}. ` +
          `Server crash prevented. This indicates a race condition in error handling.`
      );
      return;
    }

    throw error;
  };

  onModuleInit() {
    process.prependListener('uncaughtException', this.uncaughtErrorHandler);
    this.logger.info('IcyMetadataService initialized with global error safety net');
  }

  subscribe(stationUuid: string, streamUrl: string): EventEmitter {
    const emitter = new EventEmitter();

    // Handler por defecto para evitar crash si no hay listener de errores
    emitter.on('error', (error: Error) => {
      this.logger.debug(`Unhandled error for subscriber ${stationUuid}: ${error.message}`);
    });

    if (!this.streamListeners.has(stationUuid)) {
      this.streamListeners.set(stationUuid, new Set());
    }
    this.streamListeners.get(stationUuid)!.add(emitter);

    if (!this.activeStreams.has(stationUuid)) {
      this.createStreamParser(stationUuid, streamUrl);
    }

    this.logger.info(
      `Client subscribed to ${stationUuid}. Active listeners: ${this.streamListeners.get(stationUuid)!.size}`
    );

    return emitter;
  }

  unsubscribe(stationUuid: string, emitter: EventEmitter): void {
    const listeners = this.streamListeners.get(stationUuid);
    if (listeners) {
      listeners.delete(emitter);

      this.logger.info(
        `Client unsubscribed from ${stationUuid}. Active listeners: ${listeners.size}`
      );

      if (listeners.size === 0) {
        this.closeStream(stationUuid);
      }
    }
  }

  private isHttpsUrl(url: string): boolean {
    return url.toLowerCase().startsWith('https://');
  }

  private createStreamParser(stationUuid: string, streamUrl: string): void {
    let radioStation: IcecastParser | null = null;

    try {
      this.logger.info(`Creating ICY parser for ${stationUuid}: ${streamUrl}`);

      const isHttps = this.isHttpsUrl(streamUrl);

      // Definir handler antes de crear parser (se conecta inmediatamente)
      const errorHandler = (error: Error) => {
        const isDnsError =
          error.message.includes('EAI_AGAIN') ||
          error.message.includes('EAI_NODATA') ||
          error.message.includes('EAI_NONAME') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('getaddrinfo');

        const isNetworkError =
          isDnsError ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('EHOSTUNREACH');

        const isSslError =
          error.message.includes('certificate') ||
          error.message.includes('SSL') ||
          error.message.includes('TLS') ||
          error.message.includes('CERT_');

        if (isDnsError) {
          this.logger.warn(
            `DNS resolution failed for ${stationUuid} (${streamUrl}): ${error.message}. ` +
              `The stream host could not be resolved. Will retry later.`
          );
        } else if (isSslError && isHttps) {
          this.logger.warn(
            `SSL certificate error for ${stationUuid} (${streamUrl}): ${error.message}. ` +
              `This stream uses HTTPS with an untrusted certificate. Metadata will not be available.`
          );
        } else if (isNetworkError) {
          this.logger.warn(
            `Network error for ${stationUuid} (${streamUrl}): ${error.message}. ` +
              `The stream is unreachable. Will retry later.`
          );
        } else {
          this.logger.error(`ICY parser error for ${stationUuid}: ${error.message}`);
        }

        this.broadcastError(stationUuid, error);

        // Cerrar stream en errores SSL/DNS (reintentar no ayudará)
        if (isSslError || isDnsError) {
          this.closeStream(stationUuid);
        }
      };

      radioStation = new IcecastParser({
        url: streamUrl,
        keepListen: false,
        autoUpdate: true,
        notifyOnChangeOnly: true,
        errorInterval: 30,
      });

      // CRITICAL: Register error handler IMMEDIATELY after creation
      // This prevents unhandled error events from crashing the server
      // The parser may emit errors synchronously during connection setup
      radioStation.on('error', errorHandler);

      // Increase max listeners to prevent warnings (parser can have many listeners)
      radioStation.setMaxListeners(20);

      // Handle metadata events
      radioStation.on('metadata', (metadata: Map<string, string>) => {
        const parsedMetadata = this.parseMetadata(stationUuid, metadata);
        this.broadcastMetadata(stationUuid, parsedMetadata);
      });

      // Store active stream
      this.activeStreams.set(stationUuid, radioStation);

      this.logger.info(`ICY parser created successfully for ${stationUuid}`);
    } catch (error) {
      this.logger.error(`Failed to create ICY parser for ${stationUuid}:`, error);

      // Clean up partially created parser if it exists
      if (radioStation) {
        try {
          radioStation.removeAllListeners();
          if (typeof (radioStation as unknown as { destroy?: () => void }).destroy === 'function') {
            (radioStation as unknown as { destroy: () => void }).destroy();
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }

      // Emit error to all listeners
      this.broadcastError(stationUuid, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Close stream connection and cleanup
   */
  private closeStream(stationUuid: string): void {
    const stream = this.activeStreams.get(stationUuid);
    if (stream) {
      try {
        // Remove all listeners to stop processing
        stream.removeAllListeners();

        // Destroy the parser if it has a destroy method
        // This closes the underlying HTTP connection
        if (typeof (stream as unknown as { destroy?: () => void }).destroy === 'function') {
          (stream as unknown as { destroy: () => void }).destroy();
        }
      } catch (error) {
        this.logger.error(`Error closing stream ${stationUuid}:`, error);
      }

      this.activeStreams.delete(stationUuid);
      this.streamListeners.delete(stationUuid);

      this.logger.info(`Stream closed for ${stationUuid}`);
    }
  }

  /**
   * Parse raw ICY metadata into structured format
   */
  private parseMetadata(stationUuid: string, metadata: Map<string, string>): RadioMetadata {
    const result: RadioMetadata = {
      stationUuid,
      timestamp: Date.now(),
    };

    // ICY metadata comes in various formats:
    // - StreamTitle='Artist - Song'
    // - StreamTitle='Song'
    const streamTitle = metadata.get('StreamTitle');

    if (streamTitle) {
      const trimmedTitle = streamTitle.trim();

      // Try to split by ' - ' to get artist and song
      const dashIndex = trimmedTitle.indexOf(' - ');
      if (dashIndex > 0) {
        result.artist = trimmedTitle.substring(0, dashIndex).trim();
        result.song = trimmedTitle.substring(dashIndex + 3).trim();
        result.title = trimmedTitle;
      } else {
        // No artist separator, just song title
        result.song = trimmedTitle;
        result.title = trimmedTitle;
      }
    }

    return result;
  }

  /**
   * Broadcast metadata to all listeners of a station
   */
  private broadcastMetadata(stationUuid: string, metadata: RadioMetadata): void {
    const listeners = this.streamListeners.get(stationUuid);
    if (listeners) {
      this.logger.info(
        `Broadcasting metadata for ${stationUuid} to ${listeners.size} listeners: ${metadata.title}`
      );

      listeners.forEach((emitter) => {
        emitter.emit('metadata', metadata);
      });
    }
  }

  /**
   * Broadcast error to all listeners of a station
   */
  private broadcastError(stationUuid: string, error: Error): void {
    const listeners = this.streamListeners.get(stationUuid);
    if (listeners) {
      listeners.forEach((emitter) => {
        emitter.emit('error', error);
      });
    }
  }

  /**
   * Cleanup all active streams and global handlers on service shutdown
   */
  onModuleDestroy(): void {
    this.logger.info('Cleaning up IcyMetadataService...');

    // Remove global error handler
    process.removeListener('uncaughtException', this.uncaughtErrorHandler);

    // Close all active streams
    this.activeStreams.forEach((_, stationUuid) => {
      this.closeStream(stationUuid);
    });

    this.logger.info('IcyMetadataService cleanup complete');
  }

  /**
   * Get stats about active streams
   */
  getStats() {
    return {
      activeStreams: this.activeStreams.size,
      totalListeners: Array.from(this.streamListeners.values()).reduce(
        (sum, listeners) => sum + listeners.size,
        0
      ),
      streamDetails: Array.from(this.streamListeners.entries()).map(([stationUuid, listeners]) => ({
        stationUuid,
        listeners: listeners.size,
      })),
    };
  }
}
