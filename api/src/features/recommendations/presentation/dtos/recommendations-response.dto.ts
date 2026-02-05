import { ApiProperty } from '@nestjs/swagger';
import { SmartPlaylistConfigDto } from './recommendations.dto';

export class ScoreBreakdownDto {
  @ApiProperty() explicitFeedback!: number;
  @ApiProperty() implicitBehavior!: number;
  @ApiProperty() recency!: number;
  @ApiProperty() diversity!: number;
}

export class TrackDataDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ required: false }) artistName?: string;
  @ApiProperty({ required: false }) albumName?: string;
  @ApiProperty({ required: false }) duration?: number;
  @ApiProperty({ required: false }) albumId?: string;
  @ApiProperty({ required: false }) artistId?: string;
}

export class TrackScoreDto {
  @ApiProperty() trackId!: string;
  @ApiProperty() totalScore!: number;
  @ApiProperty() rank!: number;
  @ApiProperty({ type: ScoreBreakdownDto }) breakdown!: ScoreBreakdownDto;
  @ApiProperty({ type: TrackDataDto, required: false }) track?: TrackDataDto;
}

export class DailyMixMetadataDto {
  @ApiProperty() totalTracks!: number;
  @ApiProperty() avgScore!: number;
  @ApiProperty({ type: [String] }) topGenres!: string[];
  @ApiProperty({ type: [String] }) topArtists!: string[];
  @ApiProperty({ required: false }) artistId?: string;
  @ApiProperty({ required: false }) artistName?: string;
  @ApiProperty()
  temporalDistribution!: {
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
    older: number;
  };
}

export class AutoPlaylistDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['wave-mix', 'artist', 'genre', 'mood'] }) type!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: [TrackScoreDto] }) tracks!: TrackScoreDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty({ type: DailyMixMetadataDto }) metadata!: DailyMixMetadataDto;
  @ApiProperty({ required: false }) coverColor?: string;
  @ApiProperty({ required: false }) coverImageUrl?: string;
}

// Legacy alias
export class DailyMixDto extends AutoPlaylistDto {}

export class SmartPlaylistMetadataDto {
  @ApiProperty() totalTracks!: number;
  @ApiProperty() avgScore!: number;
  @ApiProperty({ type: SmartPlaylistConfigDto, required: false }) config?: SmartPlaylistConfigDto;
}

export class SmartPlaylistDto {
  @ApiProperty({ type: [TrackScoreDto] }) tracks!: TrackScoreDto[];
  @ApiProperty({ type: SmartPlaylistMetadataDto })
  metadata!: SmartPlaylistMetadataDto;
}
