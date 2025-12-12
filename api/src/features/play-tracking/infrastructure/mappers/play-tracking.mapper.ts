import { PlayEvent, PlayContext, SourceType } from '../../domain/entities/play-event.types';
import { PlayHistory } from '@infrastructure/database/schema/play-stats';

export class PlayTrackingMapper {
  static toPlayEventDomain(raw: PlayHistory): PlayEvent {
    return {
      id: raw.id,
      userId: raw.userId,
      trackId: raw.trackId,
      playedAt: raw.playedAt,
      client: raw.client || undefined,
      playContext: raw.playContext as PlayContext,
      completionRate: raw.completionRate || undefined,
      skipped: raw.skipped,
      sourceId: raw.sourceId || undefined,
      sourceType: raw.sourceType as SourceType | undefined,
      createdAt: raw.createdAt,
    };
  }

  static toPlayEventDomainArray(raw: PlayHistory[]): PlayEvent[] {
    return raw.map(this.toPlayEventDomain);
  }
}
