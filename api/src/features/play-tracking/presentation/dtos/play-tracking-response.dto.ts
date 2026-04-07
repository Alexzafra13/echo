import { ApiProperty } from '@nestjs/swagger';
import type { PlayEvent } from '../../domain/entities/play-event.entity';

export class PlayEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() trackId!: string;
  @ApiProperty() playedAt!: Date;
  @ApiProperty({ required: false }) client?: string;
  @ApiProperty() playContext!: string;
  @ApiProperty({ required: false }) completionRate?: number;
  @ApiProperty() skipped!: boolean;
  @ApiProperty({ required: false }) sourceId?: string;
  @ApiProperty({ required: false }) sourceType?: string;
  @ApiProperty() createdAt!: Date;

  static fromDomain(event: PlayEvent): PlayEventResponseDto {
    return {
      id: event.id,
      userId: event.userId,
      trackId: event.trackId,
      playedAt: event.playedAt,
      client: event.client,
      playContext: event.playContext,
      completionRate: event.completionRate,
      skipped: event.skipped,
      sourceId: event.sourceId,
      sourceType: event.sourceType,
      createdAt: event.createdAt,
    };
  }
}

export class TopTrackResponseDto {
  @ApiProperty() trackId!: string;
  @ApiProperty() playCount!: number;
  @ApiProperty() weightedPlayCount!: number;
}

export class UserPlaySummaryResponseDto {
  @ApiProperty() totalPlays!: number;
  @ApiProperty() totalSkips!: number;
  @ApiProperty() avgCompletionRate!: number;
  @ApiProperty() topContext!: string;
  @ApiProperty() playsByContext!: Record<string, number>;
  @ApiProperty({ type: [PlayEventResponseDto] }) recentPlays!: PlayEventResponseDto[];
}

export class PlayStatsResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() itemId!: string;
  @ApiProperty() itemType!: string;
  @ApiProperty() playCount!: number;
  @ApiProperty() weightedPlayCount!: number;
  @ApiProperty({ required: false }) lastPlayedAt?: Date;
  @ApiProperty({ required: false }) avgCompletionRate?: number;
  @ApiProperty() skipCount!: number;
}
