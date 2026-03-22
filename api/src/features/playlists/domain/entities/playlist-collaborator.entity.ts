import { generateUuid } from '@shared/utils';

export type CollaboratorRole = 'editor' | 'viewer';
export type CollaboratorStatus = 'pending' | 'accepted';

export interface PlaylistCollaboratorProps {
  id: string;
  playlistId: string;
  userId: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  invitedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PlaylistCollaborator {
  private constructor(private readonly props: PlaylistCollaboratorProps) {}

  static create(
    props: Omit<PlaylistCollaboratorProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): PlaylistCollaborator {
    const now = new Date();
    return new PlaylistCollaborator({
      ...props,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPrimitives(props: PlaylistCollaboratorProps): PlaylistCollaborator {
    return new PlaylistCollaborator(props);
  }

  get id(): string { return this.props.id; }
  get playlistId(): string { return this.props.playlistId; }
  get userId(): string { return this.props.userId; }
  get role(): CollaboratorRole { return this.props.role; }
  get status(): CollaboratorStatus { return this.props.status; }
  get invitedBy(): string { return this.props.invitedBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  accept(): void {
    this.props.status = 'accepted';
    this.props.updatedAt = new Date();
  }

  updateRole(role: CollaboratorRole): void {
    this.props.role = role;
    this.props.updatedAt = new Date();
  }

  toPrimitives(): PlaylistCollaboratorProps {
    return { ...this.props };
  }
}
