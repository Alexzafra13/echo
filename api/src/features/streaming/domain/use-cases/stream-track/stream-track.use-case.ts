import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TRACK_REPOSITORY, ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { getAudioMimeType } from '@shared/utils';
import { StreamTrackInput, StreamTrackOutput } from './stream-track.dto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * StreamTrackUseCase - Preparar streaming de un track
 *
 * Responsabilidades:
 * - Validar que el track existe
 * - Verificar que el archivo existe en el filesystem
 * - Obtener metadatos del archivo (tamaño, tipo MIME)
 * - Retornar información necesaria para streaming
 */
@Injectable()
export class StreamTrackUseCase {
  constructor(
    @InjectPinoLogger(StreamTrackUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: StreamTrackInput): Promise<StreamTrackOutput> {
    // 1. Validar trackId
    if (!input.trackId || input.trackId.trim() === '') {
      throw new NotFoundException('Track ID is required');
    }

    // 2. Buscar track en BD
    const track = await this.trackRepository.findById(input.trackId);

    if (!track) {
      throw new NotFoundException(`Track with ID ${input.trackId} not found`);
    }

    // 3. Obtener path del archivo
    const filePath = track.path;

    if (!filePath) {
      throw new NotFoundException(`Track ${input.trackId} has no file path`);
    }

    // 4. Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      this.logger.error({ trackId: input.trackId, filePath }, 'Audio file not found');
      throw new NotFoundException(`Audio file not found: ${filePath}`);
    }

    // 5. Obtener stats del archivo
    const stats = fs.statSync(filePath);

    if (!stats.isFile()) {
      this.logger.error({ trackId: input.trackId, filePath }, 'Path is not a file');
      throw new NotFoundException(`Path is not a file: ${filePath}`);
    }

    // 6. Detectar MIME type basado en extensión usando utilidad compartida
    const mimeType = getAudioMimeType(path.extname(filePath));

    // 7. Obtener nombre del archivo
    const fileName = path.basename(filePath);

    // 8. Retornar
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
