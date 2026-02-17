export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface LibraryScanProps {
  id: string;
  status: ScanStatus;
  startedAt: Date;
  finishedAt?: Date;
  tracksAdded: number;
  tracksUpdated: number;
  tracksDeleted: number;
  errorMessage?: string;
}

export class LibraryScan {
  private constructor(private readonly props: LibraryScanProps) {}

  static create(props: Omit<LibraryScanProps, 'id'>): LibraryScan {
    return new LibraryScan({
      id: crypto.randomUUID(),
      ...props,
    });
  }

  static fromPrimitives(props: LibraryScanProps): LibraryScan {
    return new LibraryScan(props);
  }

  get id(): string {
    return this.props.id;
  }

  get status(): ScanStatus {
    return this.props.status;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get finishedAt(): Date | undefined {
    return this.props.finishedAt;
  }

  get tracksAdded(): number {
    return this.props.tracksAdded;
  }

  get tracksUpdated(): number {
    return this.props.tracksUpdated;
  }

  get tracksDeleted(): number {
    return this.props.tracksDeleted;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  isRunning(): boolean {
    return this.status === 'running';
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  getTotalChanges(): number {
    return this.tracksAdded + this.tracksUpdated + this.tracksDeleted;
  }

  getDuration(): number | null {
    if (!this.finishedAt) {
      return null;
    }
    return this.finishedAt.getTime() - this.startedAt.getTime();
  }

  toPrimitives(): LibraryScanProps {
    return {
      id: this.id,
      status: this.status,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      tracksAdded: this.tracksAdded,
      tracksUpdated: this.tracksUpdated,
      tracksDeleted: this.tracksDeleted,
      errorMessage: this.errorMessage,
    };
  }
}
