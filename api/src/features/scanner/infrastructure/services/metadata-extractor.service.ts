import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { parseFile, type IAudioMetadata } from 'music-metadata';

// Metadatos extraídos de un archivo de música
export interface TrackMetadata {
  // Información básica
  title?: string;
  artist?: string;
  albumArtist?: string;
  album?: string;
  year?: number;
  genre?: string[];

  // Pista
  trackNumber?: number;
  discNumber?: number;
  duration?: number; // en segundos

  // Análisis DJ (tags ID3)
  bpm?: number; // tag TBPM (tempo)
  initialKey?: string; // tag TKEY (tonalidad, ej. "Am", "C", "5A")

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

      // Pista
      trackNumber: common.track?.no || undefined,
      discNumber: common.disk?.no || 1,
      duration: format.duration ? Math.round(format.duration) : undefined,

      // Análisis DJ (tags ID3: TBPM, TKEY)
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
        common.musicbrainz_artistid?.[0] || this.extractMusicBrainzId(common, 'artist'),
      musicBrainzAlbumArtistId:
        common.musicbrainz_albumartistid?.[0] || this.extractMusicBrainzId(common, 'albumartist'),

      // Otros
      comment: this.extractComment(common.comment),
      // music-metadata devuelve la letra como {language, descriptor, text}
      lyrics:
        common.lyrics?.[0]?.text ||
        (typeof common.lyrics?.[0] === 'string' ? common.lyrics[0] : undefined),
      compilation: common.compilation || false,
      coverArt: (common.picture?.length || 0) > 0,
    };
  }

  // music-metadata expone el ReplayGain en common.replaygain como IRatio (dB y ratio)
  private extractReplayGain(common: IAudioMetadata['common']): {
    trackGain?: number;
    trackPeak?: number;
    albumGain?: number;
    albumPeak?: number;
  } {
    return {
      trackGain: common.replaygain_track_gain?.dB ?? undefined,
      trackPeak: common.replaygain_track_peak?.ratio ?? undefined,
      albumGain: common.replaygain_album_gain?.dB ?? undefined,
      albumPeak: common.replaygain_album_peak?.ratio ?? undefined,
    };
  }

  // Saca el ID de MusicBrainz contemplando varios formatos
  private extractMusicBrainzId(common: IAudioMetadata['common'], type: string): string | undefined {
    const key = `musicbrainz_${type}id` as keyof IAudioMetadata['common'];
    const value = common[key];
    if (value) {
      return Array.isArray(value) ? String(value[0]) : String(value);
    }
    return undefined;
  }

  // El comentario puede venir en varios formatos
  private extractComment(comment: IAudioMetadata['common']['comment']): string | undefined {
    if (!comment) return undefined;

    if (Array.isArray(comment)) {
      const first = comment[0];
      if (!first) return undefined;
      if (typeof first === 'string') return first;
      return first.text || undefined;
    }

    return undefined;
  }
}
