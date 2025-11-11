import { PlayHistory as PrismaPlayHistory } from '@prisma/client';
import { PlayEvent, PlayContext, SourceType } from '../../domain/entities/play-event.entity';

export class PlayTrackingMapper {
  static toPlayEventDomain(prisma: PrismaPlayHistory): PlayEvent {
    return {
      id: prisma.id,
      userId: prisma.userId,
      trackId: prisma.trackId,
      playedAt: prisma.playedAt,
      client: prisma.client || undefined,
      playContext: prisma.playContext as PlayContext,
      completionRate: prisma.completionRate || undefined,
      skipped: prisma.skipped,
      sourceId: prisma.sourceId || undefined,
      sourceType: prisma.sourceType as SourceType | undefined,
      createdAt: prisma.createdAt,
    };
  }

  static toPlayEventDomainArray(prisma: PrismaPlayHistory[]): PlayEvent[] {
    return prisma.map(this.toPlayEventDomain);
  }
}
