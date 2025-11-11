import { ApiProperty } from '@nestjs/swagger';

export class ScoreBreakdownDto {
  @ApiProperty() explicitFeedback!: number;
  @ApiProperty() implicitBehavior!: number;
  @ApiProperty() recency!: number;
  @ApiProperty() diversity!: number;
}

export class TrackScoreDto {
  @ApiProperty() trackId!: string;
  @ApiProperty() totalScore!: number;
  @ApiProperty() rank!: number;
  @ApiProperty({ type: ScoreBreakdownDto }) breakdown!: ScoreBreakdownDto;
}

export class DailyMixMetadataDto {
  @ApiProperty() totalTracks!: number;
  @ApiProperty() avgScore!: number;
  @ApiProperty({ type: [String] }) topGenres!: string[];
  @ApiProperty({ type: [String] }) topArtists!: string[];
  @ApiProperty()
  temporalDistribution!: {
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
    older: number;
  };
}

export class DailyMixDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: [TrackScoreDto] }) tracks!: TrackScoreDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty({ type: DailyMixMetadataDto }) metadata!: DailyMixMetadataDto;
}

export class SmartPlaylistDto {
  @ApiProperty({ type: [TrackScoreDto] }) tracks!: TrackScoreDto[];
  @ApiProperty()
  metadata!: {
    totalTracks: number;
    avgScore: number;
    config: any;
  };
}
