import { generateUuid } from '@shared/utils';

/**
 * TrackProps - Propiedades de un Track
 */
export interface TrackProps {
  id: string;
  title: string;
  albumId?: string;
  artistId?: string;
  albumArtistId?: string;
  trackNumber?: number;
  discNumber: number;
  year?: number;
  duration?: number;
  path: string;
  bitRate?: number;
  size?: number;
  suffix?: string;
  lyrics?: string;
  comment?: string;
  albumName?: string;
  artistName?: string;
  albumArtistName?: string;
  compilation: boolean;
  // ReplayGain / Normalización de audio
  rgTrackGain?: number; // Ganancia para normalizar el track (en dB)
  rgTrackPeak?: number; // Pico máximo del track (0-1)
  rgAlbumGain?: number; // Ganancia para normalizar el álbum (en dB)
  rgAlbumPeak?: number; // Pico máximo del álbum (0-1)
  // Missing file tracking
  missingAt?: Date; // null = present, date = marked as missing
  // Play statistics
  playCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Track Entity - Representa una canción/track en el dominio
 *
 * Responsabilidades:
 * - Encapsular las propiedades de un track
 * - Proporcionar getters para acceder a los datos
 * - Factory methods para crear nuevos tracks
 * - Conversión a primitivos
 */
export class Track {
  private props: TrackProps;

  /**
   * Constructor privado - usar Track.create() o Track.reconstruct()
   */
  constructor(props: TrackProps) {
    this.props = props;
  }

  /**
   * Factory method para crear un nuevo Track
   * Genera automáticamente: id (UUID), createdAt, updatedAt
   */
  static create(
    props: Omit<TrackProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): Track {
    return new Track({
      ...props,
      id: generateUuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Factory method para reconstruir un Track desde BD
   * Se usa cuando traes datos de Drizzle
   */
  static reconstruct(props: TrackProps): Track {
    return new Track(props);
  }

  // ============ GETTERS (Solo lectura) ============

  get id(): string {
    return this.props.id;
  }

  get title(): string {
    return this.props.title;
  }

  get albumId(): string | undefined {
    return this.props.albumId;
  }

  get artistId(): string | undefined {
    return this.props.artistId;
  }

  get albumArtistId(): string | undefined {
    return this.props.albumArtistId;
  }

  get trackNumber(): number | undefined {
    return this.props.trackNumber;
  }

  get discNumber(): number {
    return this.props.discNumber;
  }

  get year(): number | undefined {
    return this.props.year;
  }

  get duration(): number | undefined {
    return this.props.duration;
  }

  get path(): string {
    return this.props.path;
  }

  get bitRate(): number | undefined {
    return this.props.bitRate;
  }

  get size(): number | undefined {
    return this.props.size;
  }

  get suffix(): string | undefined {
    return this.props.suffix;
  }

  get lyrics(): string | undefined {
    return this.props.lyrics;
  }

  get comment(): string | undefined {
    return this.props.comment;
  }

  get albumName(): string | undefined {
    return this.props.albumName;
  }

  get artistName(): string | undefined {
    return this.props.artistName;
  }

  get albumArtistName(): string | undefined {
    return this.props.albumArtistName;
  }

  get compilation(): boolean {
    return this.props.compilation;
  }

  get rgTrackGain(): number | undefined {
    return this.props.rgTrackGain;
  }

  get rgTrackPeak(): number | undefined {
    return this.props.rgTrackPeak;
  }

  get rgAlbumGain(): number | undefined {
    return this.props.rgAlbumGain;
  }

  get rgAlbumPeak(): number | undefined {
    return this.props.rgAlbumPeak;
  }

  get missingAt(): Date | undefined {
    return this.props.missingAt;
  }

  get isMissing(): boolean {
    return this.props.missingAt !== undefined && this.props.missingAt !== null;
  }

  get playCount(): number {
    return this.props.playCount;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ============ MÉTODOS DE CONVERSIÓN ============

  /**
   * Retorna todas las propiedades del track como un objeto plano
   * Útil para mapear a Drizzle o DTOs
   * IMPORTANT: Converts BigInt to number for JSON serialization
   */
  toPrimitives(): Omit<TrackProps, 'size'> & { size?: number } {
    return {
      ...this.props,
      // Convert BigInt to number for JSON serialization
      size: this.props.size !== undefined ? Number(this.props.size) : undefined,
    };
  }
}
