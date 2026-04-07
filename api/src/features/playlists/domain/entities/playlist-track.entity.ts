import { generateUuid } from '@shared/utils';

export interface PlaylistTrackProps {
  id: string;
  playlistId: string;
  trackId: string;
  trackOrder: number;
  createdAt: Date;
}

export class PlaylistTrack {
  private constructor(private readonly props: PlaylistTrackProps) {}

  static create(props: Omit<PlaylistTrackProps, 'id' | 'createdAt'>): PlaylistTrack {
    return new PlaylistTrack({
      ...props,
      id: generateUuid(),
      createdAt: new Date(),
    });
  }

  static fromPrimitives(props: PlaylistTrackProps): PlaylistTrack {
    return new PlaylistTrack(props);
  }

  get id(): string {
    return this.props.id;
  }

  get playlistId(): string {
    return this.props.playlistId;
  }

  get trackId(): string {
    return this.props.trackId;
  }

  get trackOrder(): number {
    return this.props.trackOrder;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  updateOrder(newOrder: number): void {
    this.props.trackOrder = newOrder;
  }

  toPrimitives(): PlaylistTrackProps {
    return {
      id: this.props.id,
      playlistId: this.props.playlistId,
      trackId: this.props.trackId,
      trackOrder: this.props.trackOrder,
      createdAt: this.props.createdAt,
    };
  }
}
