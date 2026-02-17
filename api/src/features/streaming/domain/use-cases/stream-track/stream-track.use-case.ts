import { Injectable, Inject } from '@nestjs/common';
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

    if (!fs.existsSync(filePath)) {
      this.logger.error({ trackId: input.trackId, filePath }, 'Audio file not found');
      throw new NotFoundError('Audio file', filePath);
    }

    const stats = fs.statSync(filePath);

    if (!stats.isFile()) {
      this.logger.error({ trackId: input.trackId, filePath }, 'Path is not a file');
      throw new NotFoundError('File', filePath);
    }

    const mimeType = getAudioMimeType(path.extname(filePath));

    const fileName = path.basename(filePath);

    return {
      trackId: track.id,
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType,
      duration: track.duration,
    };
  }
}
