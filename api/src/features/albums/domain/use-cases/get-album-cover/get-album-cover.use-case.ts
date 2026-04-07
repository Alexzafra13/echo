import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotFoundError } from '@shared/errors';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports';
import { CoverArtService } from '@shared/services';
import { getImageMimeType } from '@shared/utils';
import { GetAlbumCoverInput, GetAlbumCoverOutput } from './get-album-cover.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class GetAlbumCoverUseCase {
  constructor(
    @InjectPinoLogger(GetAlbumCoverUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
    private readonly coverArtService: CoverArtService
  ) {}

  async execute(input: GetAlbumCoverInput): Promise<GetAlbumCoverOutput> {
    if (!input.albumId || input.albumId.trim() === '') {
      throw new NotFoundError('Album', 'ID is required');
    }

    const coverPaths = await this.albumRepository.findCoverPaths(input.albumId);

    if (!coverPaths) {
      throw new NotFoundError('Album', input.albumId);
    }

    // Priority: externalCoverPath > coverArtPath (same as AlbumCoverService/ImagesController)
    const coverFileName = coverPaths.externalCoverPath || coverPaths.coverArtPath;

    if (!coverFileName) {
      throw new NotFoundError('Cover art', 'for this album');
    }

    // Resolve path: if absolute use as-is, if just a filename resolve from covers cache
    let coverPath: string;
    if (path.isAbsolute(coverFileName)) {
      coverPath = coverFileName;
    } else if (!coverFileName.includes('/') && !coverFileName.includes('\\')) {
      const resolved = this.coverArtService.getCoverPath(coverFileName);
      if (!resolved) {
        throw new NotFoundError('Cover art file', coverFileName);
      }
      coverPath = resolved;
    } else {
      coverPath = coverFileName;
    }

    try {
      const coverBuffer = await fs.readFile(coverPath);
      const mimeType = getImageMimeType(path.extname(coverPath));

      return {
        buffer: coverBuffer,
        mimeType,
        fileSize: coverBuffer.length,
      };
    } catch (error) {
      this.logger.error(
        {
          albumId: input.albumId,
          coverPath,
          error: error instanceof Error ? error.message : error,
        },
        'Error reading cover art file'
      );
      throw new NotFoundError('Cover art file', 'could not be read');
    }
  }
}
