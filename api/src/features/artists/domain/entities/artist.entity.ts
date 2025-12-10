import { generateUuid } from '@shared/utils';

/**
 * ArtistProps - Propiedades del artista
 */
export interface ArtistProps {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  playCount: number;
  mbzArtistId?: string;
  biography?: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  externalUrl?: string;
  externalInfoUpdatedAt?: Date;
  orderArtistName?: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Artist - Entidad de dominio para artistas
 *
 * Responsabilidades:
 * - Encapsular datos del artista
 * - Validar reglas de negocio
 * - Exponer información mediante getters
 */
export class Artist {
  private props: ArtistProps;

  private constructor(props: ArtistProps) {
    this.props = props;
  }

  /**
   * Crea un nuevo artista (factory method)
   */
  static create(
    props: Omit<ArtistProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): Artist {
    return new Artist({
      ...props,
      id: generateUuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Reconstituye un artista existente desde persistencia
   */
  static reconstruct(props: ArtistProps): Artist {
    return new Artist(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get albumCount(): number {
    return this.props.albumCount;
  }

  get songCount(): number {
    return this.props.songCount;
  }

  get playCount(): number {
    return this.props.playCount;
  }

  get mbzArtistId(): string | undefined {
    return this.props.mbzArtistId;
  }

  get biography(): string | undefined {
    return this.props.biography;
  }

  get smallImageUrl(): string | undefined {
    return this.props.smallImageUrl;
  }

  get mediumImageUrl(): string | undefined {
    return this.props.mediumImageUrl;
  }

  get largeImageUrl(): string | undefined {
    return this.props.largeImageUrl;
  }

  get externalUrl(): string | undefined {
    return this.props.externalUrl;
  }

  get externalInfoUpdatedAt(): Date | undefined {
    return this.props.externalInfoUpdatedAt;
  }

  get orderArtistName(): string | undefined {
    return this.props.orderArtistName;
  }

  get size(): number {
    return this.props.size;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Convierte la entidad a objeto plano (para persistencia)
   */
  toPrimitives(): ArtistProps {
    return { ...this.props };
  }
}
