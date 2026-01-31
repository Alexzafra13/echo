import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsNumber, IsEnum, IsArray, Min, Max } from 'class-validator';

// ============================================
// Analysis DTOs
// ============================================

export class AnalyzeTrackRequestDto {
  @ApiProperty({ description: 'Track ID to analyze' })
  @IsUUID()
  trackId: string;
}

export class AnalyzePlaylistRequestDto {
  @ApiProperty({ description: 'Playlist ID to analyze all tracks' })
  @IsUUID()
  playlistId: string;

  @ApiPropertyOptional({ description: 'Also process stems for mashups' })
  @IsOptional()
  processStems?: boolean;
}

export class DjAnalysisResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  trackId: string;

  @ApiPropertyOptional()
  bpm?: number;

  @ApiPropertyOptional()
  key?: string;

  @ApiPropertyOptional()
  camelotKey?: string;

  @ApiPropertyOptional()
  energy?: number;

  @ApiPropertyOptional()
  danceability?: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  analyzedAt?: Date;
}

// ============================================
// Stems DTOs
// ============================================

export class ProcessStemsRequestDto {
  @ApiProperty({ description: 'Track ID to process stems' })
  @IsUUID()
  trackId: string;
}

export class StemsStatusResponseDto {
  @ApiProperty()
  trackId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  hasStems: boolean;

  @ApiPropertyOptional()
  modelUsed?: string;

  @ApiPropertyOptional()
  totalSizeMB?: number;

  @ApiPropertyOptional()
  processedAt?: Date;
}

// ============================================
// Compatibility DTOs
// ============================================

export class GetCompatibleTracksRequestDto {
  @ApiProperty({ description: 'Source track ID' })
  @IsUUID()
  trackId: string;

  @ApiPropertyOptional({ description: 'BPM tolerance percentage (default: 6)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  bpmTolerance?: number;

  @ApiPropertyOptional({ description: 'Maximum results (default: 20)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class TrackCompatibilityDto {
  @ApiProperty()
  trackId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  artist: string;

  @ApiPropertyOptional()
  bpm?: number;

  @ApiPropertyOptional()
  key?: string;

  @ApiPropertyOptional()
  camelotKey?: string;

  @ApiProperty({ description: 'Harmonic compatibility score 0-100' })
  harmonicScore: number;

  @ApiProperty({ description: 'BPM difference percentage' })
  bpmDifference: number;

  @ApiProperty({ description: 'Overall compatibility score 0-100' })
  overallScore: number;

  @ApiProperty({ description: 'Recommended transition type' })
  recommendedTransition: string;

  @ApiProperty({ description: 'Whether mashup is possible (both have stems)' })
  canMashup: boolean;
}

// ============================================
// Transition DTOs
// ============================================

export enum TransitionTypeEnum {
  CROSSFADE = 'crossfade',
  CUT = 'cut',
  MASHUP = 'mashup',
  ECHO_OUT = 'echo_out',
}

export class CalculateTransitionRequestDto {
  @ApiProperty({ description: 'First track ID' })
  @IsUUID()
  trackAId: string;

  @ApiProperty({ description: 'Second track ID' })
  @IsUUID()
  trackBId: string;

  @ApiPropertyOptional({ description: 'Transition type', enum: TransitionTypeEnum })
  @IsOptional()
  @IsEnum(TransitionTypeEnum)
  type?: TransitionTypeEnum;

  @ApiPropertyOptional({ description: 'Duration in beats (8, 16, 32)' })
  @IsOptional()
  @IsNumber()
  durationBeats?: number;
}

export class TransitionResponseDto {
  @ApiProperty()
  type: string;

  @ApiProperty({ description: 'Seconds into track A to start transition' })
  startTimeA: number;

  @ApiProperty({ description: 'Seconds into track B to start' })
  startTimeB: number;

  @ApiProperty({ description: 'Transition duration in seconds' })
  duration: number;

  @ApiPropertyOptional({ description: 'BPM adjustment percentage for track B' })
  bpmAdjustment?: number;

  @ApiProperty({ description: 'Human-readable description' })
  description: string;
}

// ============================================
// Queue Status DTOs
// ============================================

export class DjQueueStatusResponseDto {
  @ApiProperty()
  analysis: {
    isRunning: boolean;
    pendingTracks: number;
    processedInSession: number;
    concurrency: number;
    backend: string;
  };

  @ApiProperty()
  stems: {
    isRunning: boolean;
    pendingTracks: number;
    processedInSession: number;
    concurrency: number;
    backend: string;
    isAvailable: boolean;
  };
}

// ============================================
// DJ Session DTOs
// ============================================

export class CreateDjSessionRequestDto {
  @ApiProperty({ description: 'Session name' })
  name: string;

  @ApiProperty({ description: 'Track IDs in order' })
  @IsArray()
  @IsUUID('4', { each: true })
  trackIds: string[];

  @ApiPropertyOptional({ description: 'Default transition type', enum: TransitionTypeEnum })
  @IsOptional()
  @IsEnum(TransitionTypeEnum)
  transitionType?: TransitionTypeEnum;

  @ApiPropertyOptional({ description: 'Default transition duration in seconds' })
  @IsOptional()
  @IsNumber()
  transitionDuration?: number;
}

export class DjSessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  trackCount: number;

  @ApiProperty()
  transitionType: string;

  @ApiProperty()
  transitionDuration: number;

  @ApiProperty()
  createdAt: Date;
}
