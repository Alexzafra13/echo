import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { TRACK_REPOSITORY, ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
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
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: StreamTrackInput): Promise<StreamTrackOutput> {
    // 1. Validar trackId
    if (!input.trackId || input.trackId.trim() === '') {
      throw new NotFoundException('Track ID is required');
    }

    console.log('🎵 [StreamTrack] Attempting to stream track:', input.trackId);

    // 2. Buscar track en BD
    const track = await this.trackRepository.findById(input.trackId);

    if (!track) {
      console.error('❌ [StreamTrack] Track not found in database:', input.trackId);
      throw new NotFoundException(`Track with ID ${input.trackId} not found`);
    }

    console.log('✅ [StreamTrack] Track found:', { id: track.id, title: track.title });

    // 3. Obtener path del archivo
    const filePath = track.path;

    if (!filePath) {
      console.error('❌ [StreamTrack] Track has no file path:', track.id);
      throw new NotFoundException(`Track ${input.trackId} has no file path`);
    }

    console.log('📂 [StreamTrack] File path from DB:', filePath);
    console.log('📂 [StreamTrack] Current working directory:', process.cwd());
    console.log('📂 [StreamTrack] Resolved path:', path.resolve(filePath));

    // 4. Verificar que el archivo existe
    const fileExists = fs.existsSync(filePath);
    console.log(`📂 [StreamTrack] File exists check: ${fileExists}`);

    if (!fileExists) {
      console.error('❌ [StreamTrack] Audio file not found at:', filePath);
      throw new NotFoundException(`Audio file not found: ${filePath}`);
    }

    // 5. Obtener stats del archivo
    const stats = fs.statSync(filePath);

    if (!stats.isFile()) {
      console.error('❌ [StreamTrack] Path is not a file:', filePath);
      throw new NotFoundException(`Path is not a file: ${filePath}`);
    }

    // 6. Detectar MIME type basado en extensión
    const mimeType = this.getMimeType(filePath);

    // 7. Obtener nombre del archivo
    const fileName = path.basename(filePath);

    console.log('✅ [StreamTrack] Ready to stream:', {
      fileName,
      fileSize: stats.size,
      mimeType,
    });

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

  /**
   * Detecta el MIME type basado en la extensión del archivo
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg',
      '.oga': 'audio/ogg',
      '.opus': 'audio/opus',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.wav': 'audio/wav',
      '.wma': 'audio/x-ms-wma',
    };

    return mimeTypes[ext] || 'audio/mpeg'; // Default to MP3
  }
}
