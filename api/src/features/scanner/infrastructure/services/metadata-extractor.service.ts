import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { parseFile, type IAudioMetadata, type ICommonTagsResult } from 'music-metadata';

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

  // DJ/Audio analysis (from ID3 tags)
  bpm?: number; // TBPM tag - tempo in beats per minute
  initialKey?: string; // TKEY tag - musical key (e.g., "Am", "C", "5A")

  // Técnicos
  bitRate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;

  // ReplayGain / Normalización de audio
  rgTrackGain?: number; // Ganancia para normalizar el track (en dB)
  rgTrackPeak?: number; // Pico máximo del track (0-1)
  rgAlbumGain?: number; // Ganancia para normalizar el álbum (en dB)
  rgAlbumPeak?: number; // Pico máximo del álbum (0-1)

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

@Injectable()
export class MetadataExtractorService {
  constructor(
    @InjectPinoLogger(MetadataExtractorService.name)
    private readonly logger: PinoLogger
  ) {}

  async extractMetadata(filePath: string): Promise<TrackMetadata | null> {
    try {
      const metadata = await parseFile(filePath, {
        duration: true,
        skipCovers: false,
      });

      return this.normalizeMetadata(metadata);
    } catch (error) {
      this.logger.error({ err: error, filePath }, 'Error extracting metadata');
      return null;
    }
  }

  private normalizeMetadata(metadata: IAudioMetadata): TrackMetadata {
    const { common, format } = metadata;

    // Extraer ReplayGain si existe
    const replayGain = this.extractReplayGain(common);

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

      // DJ/Audio analysis from ID3 tags (TBPM, TKEY)
      bpm: common.bpm ? Math.round(common.bpm) : undefined,
      initialKey: common.key || undefined,

      // Técnicos
      bitRate: format.bitrate ? Math.round(format.bitrate) : undefined,
      sampleRate: format.sampleRate || undefined,
      channels: format.numberOfChannels || undefined,
      codec: format.codec || undefined,

      // ReplayGain / Normalización
      rgTrackGain: replayGain.trackGain,
      rgTrackPeak: replayGain.trackPeak,
      rgAlbumGain: replayGain.albumGain,
      rgAlbumPeak: replayGain.albumPeak,

      // MusicBrainz IDs
      musicBrainzTrackId:
        common.musicbrainz_recordingid || this.extractMusicBrainzId(common, 'recording'),
      musicBrainzAlbumId: common.musicbrainz_albumid || this.extractMusicBrainzId(common, 'album'),
      musicBrainzArtistId:
        common.musicbrainz_artistid || this.extractMusicBrainzId(common, 'artist'),
      musicBrainzAlbumArtistId:
        common.musicbrainz_albumartistid || this.extractMusicBrainzId(common, 'albumartist'),

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
   * Extrae valores de ReplayGain de los metadatos
   * music-metadata proporciona estos valores en common.replaygain
   */
  private extractReplayGain(common: ICommonTagsResult): {
    trackGain?: number;
    trackPeak?: number;
    albumGain?: number;
    albumPeak?: number;
  } {
    const rg = common.replaygain;
    if (!rg) return {};

    return {
      // Track gain/peak
      trackGain: rg.track?.dB ?? undefined,
      trackPeak: rg.track?.ratio ?? undefined,
      // Album gain/peak
      albumGain: rg.album?.dB ?? undefined,
      albumPeak: rg.album?.ratio ?? undefined,
    };
  }

  /**
   * Extrae ID de MusicBrainz de diferentes formatos
   */
  private extractMusicBrainzId(common: ICommonTagsResult, type: string): string | undefined {
    const key = `musicbrainz_${type}id` as keyof ICommonTagsResult;
    const value = common[key];
    if (value) {
      return Array.isArray(value) ? String(value[0]) : String(value);
    }
    return undefined;
  }

  /**
   * Extrae comentario (puede venir en diferentes formatos)
   */
  private extractComment(comment: ICommonTagsResult['comment']): string | undefined {
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
