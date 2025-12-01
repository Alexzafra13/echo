import { generateUuid } from '@shared/utils';

/**
 * Interfaz que define la estructura de propiedades del Album
 */
export interface AlbumProps {
  id: string;
  name: string;
  artistId?: string;
  artistName?: string; // Artist name for display
  albumArtistId?: string;
  coverArtPath?: string;
  year?: number;
  releaseDate?: Date;
  compilation: boolean;
  songCount: number;
  duration: number;
  size: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Album Entity - Representa un álbum en el dominio
 *
 * Responsabilidades:
 * - Encapsular las propiedades de un álbum
 * - Proporcionar getters para acceder a los datos
 * - Crear nuevos álbumes con factory method
 * - Convertir a primitivos (para mapear a BD o DTOs)
 */
export class Album {
  private props: AlbumProps;

  /**
   * Constructor privado - no llamar directamente
   * Usar Album.create() en su lugar
   */
  constructor(props: AlbumProps) {
    this.props = props;
  }

  /**
   * Factory method para crear un nuevo Album
   * Genera automáticamente: id (UUID), createdAt, updatedAt
   */
  static create(
    props: Omit<AlbumProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): Album {
    return new Album({
      ...props,
      id: generateUuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Factory method para reconstruir un Album desde BD
   * Se usa cuando traes datos de Drizzle
   */
  static reconstruct(props: AlbumProps): Album {
    return new Album(props);
  }

  // ============ GETTERS (Solo lectura) ============

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get artistId(): string | undefined {
    return this.props.artistId;
  }

  get artistName(): string | undefined {
    return this.props.artistName;
  }

  get albumArtistId(): string | undefined {
    return this.props.albumArtistId;
  }

  get coverArtPath(): string | undefined {
    return this.props.coverArtPath;
  }

  get year(): number | undefined {
    return this.props.year;
  }

  get releaseDate(): Date | undefined {
    return this.props.releaseDate;
  }

  get compilation(): boolean {
    return this.props.compilation;
  }

  get songCount(): number {
    return this.props.songCount;
  }

  get duration(): number {
    return this.props.duration;
  }

  get size(): number {
    return this.props.size;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ============ MÉTODOS DE CONVERSIÓN ============

  /**
   * Retorna todas las propiedades del álbum como un objeto plano
   * Útil para mapear a Drizzle o DTOs
   */
  toPrimitives(): AlbumProps {
    return { ...this.props };
  }
}