import { generateUuid } from '@shared/utils';

export interface AlbumProps {
  id: string;
  name: string;
  artistId?: string;
  artistName?: string;
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

export class Album {
  private props: AlbumProps;

  constructor(props: AlbumProps) {
    this.props = props;
  }

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

  // Reconstruye un Album desde datos persistidos
  static reconstruct(props: AlbumProps): Album {
    return new Album(props);
  }

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

  toPrimitives(): AlbumProps {
    return { ...this.props };
  }
}