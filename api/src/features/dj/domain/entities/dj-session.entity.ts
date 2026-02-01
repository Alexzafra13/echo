/**
 * DJ Session Entity
 * Represents a saved DJ mix session with ordered tracks
 */

export interface DjSessionTrack {
  trackId: string;
  order: number;
  // DJ metadata at time of adding
  bpm?: number;
  camelotKey?: string;
  energy?: number;
  // Compatibility with previous track
  compatibilityScore?: number;
}

export interface DjSessionProps {
  id: string;
  userId: string;
  name: string;
  transitionType: 'crossfade' | 'mashup' | 'cut';
  transitionDuration: number;
  trackList: DjSessionTrack[];
  createdAt: Date;
  updatedAt: Date;
}

export class DjSessionEntity {
  private constructor(private readonly props: DjSessionProps) {}

  static create(props: DjSessionProps): DjSessionEntity {
    return new DjSessionEntity(props);
  }

  static fromPrimitives(data: DjSessionProps): DjSessionEntity {
    return new DjSessionEntity(data);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get transitionType(): 'crossfade' | 'mashup' | 'cut' {
    return this.props.transitionType;
  }

  get transitionDuration(): number {
    return this.props.transitionDuration;
  }

  get trackList(): DjSessionTrack[] {
    return this.props.trackList;
  }

  get trackCount(): number {
    return this.props.trackList.length;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toPrimitives(): DjSessionProps {
    return { ...this.props };
  }

  addTrack(track: DjSessionTrack): void {
    this.props.trackList.push(track);
    this.props.updatedAt = new Date();
  }

  removeTrack(trackId: string): void {
    this.props.trackList = this.props.trackList.filter(t => t.trackId !== trackId);
    // Reorder remaining tracks
    this.props.trackList.forEach((t, i) => t.order = i);
    this.props.updatedAt = new Date();
  }

  reorderTracks(trackIds: string[]): void {
    const trackMap = new Map(this.props.trackList.map(t => [t.trackId, t]));
    this.props.trackList = trackIds
      .map((id, index) => {
        const track = trackMap.get(id);
        if (track) {
          track.order = index;
          return track;
        }
        return null;
      })
      .filter((t): t is DjSessionTrack => t !== null);
    this.props.updatedAt = new Date();
  }

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }
}
