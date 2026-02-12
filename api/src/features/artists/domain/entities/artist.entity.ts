import { generateUuid } from '@shared/utils';

export interface ArtistProps {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
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

export class Artist {
  private props: ArtistProps;

  private constructor(props: ArtistProps) {
    this.props = props;
  }

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

  static reconstruct(props: ArtistProps): Artist {
    return new Artist(props);
  }

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

  toPrimitives(): ArtistProps {
    return { ...this.props };
  }
}
