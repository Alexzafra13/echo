import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotFoundError } from '@shared/errors';
import { TRACK_REPOSITORY, ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { getAudioMimeType } from '@shared/utils';
import { StreamTrackInput, StreamTrackOutput } from './stream-track.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StreamTrackUseCase {
  constructor(
    @InjectPinoLogger(StreamTrackUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  /**
   * Validates that the resolved file path is within the allowed data directory.
   * Prevents path traversal attacks if database is compromised.
   */
  private validateFilePath(filePath: string): string {
    const resolved = path.resolve(filePath);
    const dataPath = path.resolve(process.env.DATA_PATH || '/app/data');

    if (!resolved.startsWith(dataPath + path.sep) && resolved !== dataPath) {
      this.logger.error(
        { filePath, resolved, dataPath },
        'Path traversal attempt detected - file path outside data directory',
      );
      throw new ForbiddenException('Invalid file path');
    }

    return resolved;
  }

  async execute(input: StreamTrackInput): Promise<StreamTrackOutput> {
    if (!input.trackId || input.trackId.trim() === '') {
      throw new NotFoundError('Track', 'ID is required');
    }

    const track = await this.trackRepository.findById(input.trackId);

    if (!track) {
      throw new NotFoundError('Track', input.trackId);
    }

    const filePath = track.path;

    if (!filePath) {
      throw new NotFoundError('Track', `${input.trackId} has no file path`);
    }

    const safePath = this.validateFilePath(filePath);

    if (!fs.existsSync(safePath)) {
      this.logger.error({ trackId: input.trackId, filePath: safePath }, 'Audio file not found');
      throw new NotFoundError('Audio file', safePath);
    }

    const stats = fs.statSync(safePath);

    if (!stats.isFile()) {
      this.logger.error({ trackId: input.trackId, filePath: safePath }, 'Path is not a file');
      throw new NotFoundError('File', safePath);
    }

    const mimeType = getAudioMimeType(path.extname(safePath));

    const fileName = path.basename(safePath);

    return {
      trackId: track.id,
      filePath: safePath,
      fileName,
      fileSize: stats.size,
      mimeType,
      duration: track.duration,
    };
  }
}
