import { generateUuid } from '@shared/utils';

export interface PlaylistProps {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  duration: number;
  size: number;
  ownerId: string;
  public: boolean;
  songCount: number;
  path?: string;
  sync: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Playlist {
  private constructor(private readonly props: PlaylistProps) {}

  static create(props: Omit<PlaylistProps, 'id' | 'createdAt' | 'updatedAt'>): Playlist {
    const now = new Date();
    return new Playlist({
      ...props,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPrimitives(props: PlaylistProps): Playlist {
    return new Playlist(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get coverImageUrl(): string | undefined {
    return this.props.coverImageUrl;
  }

  get duration(): number {
    return this.props.duration;
  }

  get size(): number {
    return this.props.size;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get public(): boolean {
    return this.props.public;
  }

  get songCount(): number {
    return this.props.songCount;
  }

  get path(): string | undefined {
    return this.props.path;
  }

  get sync(): boolean {
    return this.props.sync;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  updateDescription(description?: string): void {
    this.props.description = description;
    this.props.updatedAt = new Date();
  }

  updateCoverImage(coverImageUrl?: string): void {
    this.props.coverImageUrl = coverImageUrl;
    this.props.updatedAt = new Date();
  }

  updateDuration(duration: number): void {
    this.props.duration = duration;
    this.props.updatedAt = new Date();
  }

  updateSize(size: number): void {
    this.props.size = size;
    this.props.updatedAt = new Date();
  }

  updateSongCount(songCount: number): void {
    this.props.songCount = songCount;
    this.props.updatedAt = new Date();
  }

  setPublic(isPublic: boolean): void {
    this.props.public = isPublic;
    this.props.updatedAt = new Date();
  }

  toPrimitives(): PlaylistProps {
    return {
      id: this.props.id,
      name: this.props.name,
      description: this.props.description,
      coverImageUrl: this.props.coverImageUrl,
      duration: this.props.duration,
      size: this.props.size,
      ownerId: this.props.ownerId,
      public: this.props.public,
      songCount: this.props.songCount,
      path: this.props.path,
      sync: this.props.sync,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
