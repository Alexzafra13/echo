import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { getVideoMimeType } from '@shared/utils';
import {
  MUSIC_VIDEO_REPOSITORY,
  IMusicVideoRepository,
} from '../ports/music-video-repository.port';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface StreamVideoInput {
  videoId: string;
}

export interface StreamVideoOutput {
  videoId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration: number | null;
}

@Injectable()
export class StreamMusicVideoUseCase {
  private static readonly ALLOWED_ROOTS = ['/mnt', '/media', '/music', '/data', '/home', '/app'];
  private static readonly IS_WINDOWS = process.platform === 'win32';

  constructor(
    @InjectPinoLogger(StreamMusicVideoUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(MUSIC_VIDEO_REPOSITORY)
    private readonly repository: IMusicVideoRepository
  ) {}

  private validateFilePath(filePath: string): string {
    const resolved = path.resolve(filePath);

    const isAllowed = StreamMusicVideoUseCase.IS_WINDOWS
      ? /^[A-Za-z]:\\/.test(resolved)
      : StreamMusicVideoUseCase.ALLOWED_ROOTS.some(
          (root) => resolved.startsWith(root + path.sep) || resolved === root
        );

    if (!isAllowed) {
      this.logger.error({ filePath, resolved }, 'Path traversal attempt detected');
      throw new ForbiddenError('Invalid file path');
    }

    return resolved;
  }

  async execute(input: StreamVideoInput): Promise<StreamVideoOutput> {
    const video = await this.repository.findById(input.videoId);

    if (!video) {
      throw new NotFoundError('Music video', input.videoId);
    }

    const safePath = this.validateFilePath(video.path);

    let stats: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stats = await fs.stat(safePath);
    } catch {
      this.logger.error({ videoId: input.videoId, filePath: safePath }, 'Video file not found');
      throw new NotFoundError('Video file', input.videoId);
    }

    if (!stats.isFile()) {
      throw new NotFoundError('File', safePath);
    }

    const mimeType = getVideoMimeType(path.extname(safePath));
    const fileName = path.basename(safePath);

    return {
      videoId: video.id,
      filePath: safePath,
      fileName,
      fileSize: stats.size,
      mimeType,
      duration: video.duration,
    };
  }
}
