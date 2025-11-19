import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Parser as IcecastParser } from 'icecast-parser';

export interface RadioMetadata {
  stationUuid: string;
  title?: string;
  artist?: string;
  song?: string;
  timestamp: number;
}

/**
 * Service for parsing ICY metadata from internet radio streams
 * Uses icecast-parser to extract "now playing" information
 * Only connects to streams when clients are actively listening
 */
@Injectable()
export class IcyMetadataService {
  private readonly logger = new Logger(IcyMetadataService.name);
  private activeStreams = new Map<string, IcecastParser>();
  private streamListeners = new Map<string, Set<EventEmitter>>();

  /**
   * Subscribe to metadata updates for a radio station
   * Creates stream connection if not already active
   */
  subscribe(stationUuid: string, streamUrl: string): EventEmitter {
    const emitter = new EventEmitter();

    // Add listener to tracking
    if (!this.streamListeners.has(stationUuid)) {
      this.streamListeners.set(stationUuid, new Set());
    }
    this.streamListeners.get(stationUuid)!.add(emitter);

    // Create stream parser if not already active
    if (!this.activeStreams.has(stationUuid)) {
      this.createStreamParser(stationUuid, streamUrl);
    }

    this.logger.log(
      `Client subscribed to ${stationUuid}. Active listeners: ${this.streamListeners.get(stationUuid)!.size}`,
    );

    return emitter;
  }

  /**
   * Unsubscribe from metadata updates
   * Closes stream connection if no more listeners
   */
  unsubscribe(stationUuid: string, emitter: EventEmitter): void {
    const listeners = this.streamListeners.get(stationUuid);
    if (listeners) {
      listeners.delete(emitter);

      this.logger.log(
        `Client unsubscribed from ${stationUuid}. Active listeners: ${listeners.size}`,
      );

      // Close stream if no more listeners
      if (listeners.size === 0) {
        this.closeStream(stationUuid);
      }
    }
  }

  /**
   * Create ICY metadata parser for stream
   */
  private createStreamParser(stationUuid: string, streamUrl: string): void {
    try {
      this.logger.log(`Creating ICY parser for ${stationUuid}: ${streamUrl}`);

      const radioStation = new IcecastParser({
        url: streamUrl,
        keepListen: false, // Don't keep listening after metadata
        autoUpdate: true, // Automatically update metadata
        notifyOnChangeOnly: true, // Only emit when metadata changes
      });

      // Handle metadata events
      radioStation.on('metadata', (metadata: Map<string, string>) => {
        const parsedMetadata = this.parseMetadata(stationUuid, metadata);
        this.broadcastMetadata(stationUuid, parsedMetadata);
      });

      // Handle errors
      radioStation.on('error', (error: Error) => {
        this.logger.error(
          `ICY parser error for ${stationUuid}: ${error.message}`,
        );
        // Emit error to all listeners
        this.broadcastError(stationUuid, error);
      });

      // Store active stream
      this.activeStreams.set(stationUuid, radioStation);

      this.logger.log(`ICY parser created successfully for ${stationUuid}`);
    } catch (error) {
      this.logger.error(
        `Failed to create ICY parser for ${stationUuid}:`,
        error,
      );
      // Emit error to all listeners
      this.broadcastError(
        stationUuid,
        error instanceof Error ? error : new Error(String(error)),
      );
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
      } catch (error) {
        this.logger.error(`Error closing stream ${stationUuid}:`, error);
      }

      this.activeStreams.delete(stationUuid);
      this.streamListeners.delete(stationUuid);

      this.logger.log(`Stream closed for ${stationUuid}`);
    }
  }

  /**
   * Parse raw ICY metadata into structured format
   */
  private parseMetadata(
    stationUuid: string,
    metadata: Map<string, string>,
  ): RadioMetadata {
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
  private broadcastMetadata(
    stationUuid: string,
    metadata: RadioMetadata,
  ): void {
    const listeners = this.streamListeners.get(stationUuid);
    if (listeners) {
      this.logger.log(
        `Broadcasting metadata for ${stationUuid} to ${listeners.size} listeners: ${metadata.title}`,
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
   * Cleanup all active streams on service shutdown
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up all active ICY streams...');
    this.activeStreams.forEach((stream, stationUuid) => {
      this.closeStream(stationUuid);
    });
  }

  /**
   * Get stats about active streams
   */
  getStats() {
    return {
      activeStreams: this.activeStreams.size,
      totalListeners: Array.from(this.streamListeners.values()).reduce(
        (sum, listeners) => sum + listeners.size,
        0,
      ),
      streamDetails: Array.from(this.streamListeners.entries()).map(
        ([stationUuid, listeners]) => ({
          stationUuid,
          listeners: listeners.size,
        }),
      ),
    };
  }
}
