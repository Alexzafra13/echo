import { generateUuid } from '@shared/utils';

export type ParticipantRole = 'host' | 'dj' | 'listener';
export type SessionMode = 'sync' | 'jukebox';

export interface ListeningSessionProps {
  id: string;
  hostId: string;
  name: string;
  inviteCode: string;
  isActive: boolean;
  mode: SessionMode;
  currentTrackId?: string;
  currentPosition: number;
  guestsCanControl: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionParticipantProps {
  id: string;
  sessionId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
}

export interface SessionQueueItemProps {
  id: string;
  sessionId: string;
  trackId: string;
  addedBy: string;
  position: number;
  played: boolean;
  createdAt: Date;
}

export class ListeningSession {
  private constructor(private readonly props: ListeningSessionProps) {}

  static create(
    props: Pick<ListeningSessionProps, 'hostId' | 'name'> & { mode?: SessionMode }
  ): ListeningSession {
    const now = new Date();
    return new ListeningSession({
      ...props,
      id: generateUuid(),
      inviteCode: generateInviteCode(),
      isActive: true,
      mode: props.mode || 'sync',
      currentPosition: 0,
      guestsCanControl: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPrimitives(props: ListeningSessionProps): ListeningSession {
    return new ListeningSession(props);
  }

  get id(): string {
    return this.props.id;
  }
  get hostId(): string {
    return this.props.hostId;
  }
  get name(): string {
    return this.props.name;
  }
  get inviteCode(): string {
    return this.props.inviteCode;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get currentTrackId(): string | undefined {
    return this.props.currentTrackId;
  }
  get currentPosition(): number {
    return this.props.currentPosition;
  }
  get mode(): SessionMode {
    return this.props.mode;
  }
  get guestsCanControl(): boolean {
    return this.props.guestsCanControl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  end(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  setCurrentTrack(trackId: string, position: number = 0): void {
    this.props.currentTrackId = trackId;
    this.props.currentPosition = position;
    this.props.updatedAt = new Date();
  }

  updatePosition(position: number): void {
    this.props.currentPosition = position;
    this.props.updatedAt = new Date();
  }

  updateSettings(settings: { guestsCanControl?: boolean }): void {
    if (settings.guestsCanControl !== undefined) {
      this.props.guestsCanControl = settings.guestsCanControl;
    }
    this.props.updatedAt = new Date();
  }

  toPrimitives(): ListeningSessionProps {
    return { ...this.props };
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
