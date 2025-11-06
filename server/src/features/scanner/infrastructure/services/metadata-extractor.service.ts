import { Injectable } from '@nestjs/common';
import { parseFile } from 'music-metadata';

/**
 * TrackMetadata - Metadatos extraídos de un archivo de música
 */
export interface TrackMetadata {
  // Información básica
  title?: string;
  artist?: string;
  albumArtist?: string;
  album?: string;
  year?: number;
  genre?: string[];

  // Track info
  trackNumber?: number;
  discNumber?: number;
  duration?: number; // en segundos

  // Técnicos
  bitRate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;

  // IDs externos
  musicBrainzTrackId?: string;
  musicBrainzAlbumId?: string;
  musicBrainzArtistId?: string;
  musicBrainzAlbumArtistId?: string;

  // Otros
  comment?: string | { language?: string; descriptor?: string; text?: string };
  lyrics?: string;
  compilation?: boolean;
  coverArt?: boolean;
}

/**
 * MetadataExtractorService - Extrae metadatos de archivos de música
 *
 * Responsabilidades:
 * - Usar music-metadata para leer tags ID3, Vorbis, etc.
 * - Normalizar metadatos a un formato común
 * - Manejar errores de lectura
 */
@Injectable()
export class MetadataExtractorService {
  /**
   * Extrae metadatos de un archivo de música
   *
   * @param filePath - Ruta absoluta del archivo
   * @returns Metadatos extraídos o null si hay error
   */
  async extractMetadata(filePath: string): Promise<TrackMetadata | null> {
    try {
      const metadata = await parseFile(filePath, {
        duration: true,
        skipCovers: false,
      });

      return this.normalizeMetadata(metadata);
    } catch (error) {
      console.error(`Error extrayendo metadatos de ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Normaliza metadatos de music-metadata a nuestro formato
   */
  private normalizeMetadata(metadata: any): TrackMetadata {
    const { common, format } = metadata;

    return {
      // Información básica
      title: common.title || undefined,
      artist: common.artist || undefined,
      albumArtist: common.albumartist || undefined,
      album: common.album || undefined,
      year: common.year || undefined,
      genre: common.genre || undefined,

      // Track info
      trackNumber: common.track?.no || undefined,
      discNumber: common.disk?.no || 1,
      duration: format.duration ? Math.round(format.duration) : undefined,

      // Técnicos
      bitRate: format.bitrate ? Math.round(format.bitrate) : undefined,
      sampleRate: format.sampleRate || undefined,
      channels: format.numberOfChannels || undefined,
      codec: format.codec || undefined,

      // MusicBrainz IDs
      musicBrainzTrackId:
        common.musicbrainz_recordingid ||
        this.extractMusicBrainzId(common, 'recording'),
      musicBrainzAlbumId:
        common.musicbrainz_albumid ||
        this.extractMusicBrainzId(common, 'album'),
      musicBrainzArtistId:
        common.musicbrainz_artistid ||
        this.extractMusicBrainzId(common, 'artist'),
      musicBrainzAlbumArtistId:
        common.musicbrainz_albumartistid ||
        this.extractMusicBrainzId(common, 'albumartist'),

      // Otros
      comment: this.extractComment(common.comment),
      // Extract text from lyrics object: music-metadata returns {language, descriptor, text}
      lyrics:
        common.lyrics?.[0]?.text ||
        (typeof common.lyrics?.[0] === 'string' ? common.lyrics[0] : undefined),
      compilation: common.compilation || false,
      coverArt: (common.picture?.length || 0) > 0,
    };
  }

  /**
   * Extrae ID de MusicBrainz de diferentes formatos
   */
  private extractMusicBrainzId(common: any, type: string): string | undefined {
    const key = `musicbrainz_${type}id`;
    if (common[key]) {
      return Array.isArray(common[key]) ? common[key][0] : common[key];
    }
    return undefined;
  }

  /**
   * Extrae comentario (puede venir en diferentes formatos)
   */
  private extractComment(comment: any): string | undefined {
    if (!comment) return undefined;

    if (Array.isArray(comment)) {
      return comment[0]?.text || comment[0] || undefined;
    }

    if (typeof comment === 'object') {
      return comment.text || undefined;
    }

    return comment;
  }

  /**
   * Valida que los metadatos mínimos existan
   */
  validateMetadata(metadata: TrackMetadata): boolean {
    // Al menos debe tener título o artist
    return !!(metadata.title || metadata.artist);
  }
}
