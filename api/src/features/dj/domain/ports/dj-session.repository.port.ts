import { DjSessionEntity, DjSessionTrack } from '../entities/dj-session.entity';

export const DJ_SESSION_REPOSITORY = Symbol('DJ_SESSION_REPOSITORY');

export interface CreateDjSessionData {
  userId: string;
  name: string;
  transitionType?: 'crossfade' | 'mashup' | 'cut';
  transitionDuration?: number;
  trackList: DjSessionTrack[];
}

export interface UpdateDjSessionData {
  name?: string;
  transitionType?: 'crossfade' | 'mashup' | 'cut';
  transitionDuration?: number;
  trackList?: DjSessionTrack[];
}

export interface IDjSessionRepository {
  create(data: CreateDjSessionData): Promise<DjSessionEntity>;
  findById(id: string): Promise<DjSessionEntity | null>;
  findByUserId(userId: string): Promise<DjSessionEntity[]>;
  update(id: string, data: UpdateDjSessionData): Promise<DjSessionEntity | null>;
  delete(id: string): Promise<boolean>;
  addTrackToSession(sessionId: string, track: DjSessionTrack): Promise<DjSessionEntity | null>;
  removeTrackFromSession(sessionId: string, trackId: string): Promise<DjSessionEntity | null>;
  reorderTracks(sessionId: string, trackIds: string[]): Promise<DjSessionEntity | null>;
}
