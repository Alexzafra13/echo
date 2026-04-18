export interface GenreProps {
  id: string;
  name: string;
  trackCount: number;
  albumCount: number;
  artistCount: number;
  coverAlbumId?: string;
  coverAlbumUpdatedAt?: Date;
  coverAlbumExternalInfoUpdatedAt?: Date;
}

export class Genre {
  private props: GenreProps;

  constructor(props: GenreProps) {
    this.props = props;
  }

  static reconstruct(props: GenreProps): Genre {
    return new Genre(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get trackCount(): number {
    return this.props.trackCount;
  }

  get albumCount(): number {
    return this.props.albumCount;
  }

  get artistCount(): number {
    return this.props.artistCount;
  }

  get coverAlbumId(): string | undefined {
    return this.props.coverAlbumId;
  }

  get coverAlbumUpdatedAt(): Date | undefined {
    return this.props.coverAlbumUpdatedAt;
  }

  get coverAlbumExternalInfoUpdatedAt(): Date | undefined {
    return this.props.coverAlbumExternalInfoUpdatedAt;
  }

  toPrimitives(): GenreProps {
    return { ...this.props };
  }
}
