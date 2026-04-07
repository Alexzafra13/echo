import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotFoundError } from '@shared/errors';
import {
  TRACK_REPOSITORY,
  ITrackRepository,
} from '@features/tracks/domain/ports/track-repository.port';
import { FilesystemService } from '@infrastructure/filesystem/filesystem.service';
import { getAudioMimeType } from '@shared/utils';
import { StreamTrackInput, StreamTrackOutput } from './stream-track.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StreamTrackUseCase {
  constructor(
    @InjectPinoLogger(StreamTrackUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
    private readonly filesystemService: FilesystemService
  ) {}

  async execute(input: StreamTrackInput): Promise<StreamTrackOutput> {
    const track = await this.trackRepository.findById(input.trackId);

    if (!track) {
      throw new NotFoundError('Track', input.trackId);
    }

    const filePath = track.path;

    if (!filePath) {
      throw new NotFoundError('Track', `${input.trackId} has no file path`);
    }

    const safePath = this.filesystemService.validateMusicPath(filePath);

    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(safePath);
    } catch {
      this.logger.error({ trackId: input.trackId, filePath: safePath }, 'Audio file not found');
      throw new NotFoundError('Audio file', safePath);
    }

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
