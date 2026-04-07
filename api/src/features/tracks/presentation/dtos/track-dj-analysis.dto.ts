import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DjAnalysis } from '@features/dj/domain/entities/dj-analysis.entity';
import { CAMELOT_COLORS } from '@features/dj/config/dj.config';

export class CamelotColorDto {
  @ApiProperty({ example: '#5454B4', description: 'Background color' })
  bg!: string;

  @ApiProperty({ example: '#FFFFFF', description: 'Text color' })
  text!: string;

  @ApiProperty({ example: 'Indigo', description: 'Color name' })
  name!: string;
}

export class TrackDjAnalysisDto {
  @ApiProperty({ example: 'completed', enum: ['pending', 'analyzing', 'completed', 'failed'] })
  status!: string;

  @ApiPropertyOptional({ example: 128, description: 'BPM (beats per minute)' })
  bpm?: number;

  @ApiPropertyOptional({ example: 'Am', description: 'Musical key' })
  key?: string;

  @ApiPropertyOptional({ example: '8A', description: 'Camelot wheel notation' })
  camelotKey?: string;

  @ApiPropertyOptional({ type: CamelotColorDto, description: 'Camelot key color' })
  camelotColor?: CamelotColorDto;

  @ApiPropertyOptional({ example: 0.78, description: 'Energy level (0-1)' })
  energy?: number;

  @ApiPropertyOptional({ example: 0.62, description: 'Danceability (0-1)' })
  danceability?: number;

  @ApiPropertyOptional({ example: 'FFmpeg decode failed', description: 'Error message if analysis failed' })
  analysisError?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z', description: 'When analysis was completed' })
  analyzedAt?: string;

  static fromDomain(analysis: DjAnalysis | null): TrackDjAnalysisDto | null {
    if (!analysis) return null;

    const camelotColor = analysis.camelotKey
      ? CAMELOT_COLORS[analysis.camelotKey] || null
      : null;

    const dto = new TrackDjAnalysisDto();
    dto.status = analysis.status;
    dto.bpm = analysis.bpm;
    dto.key = analysis.key;
    dto.camelotKey = analysis.camelotKey;
    dto.camelotColor = camelotColor
      ? { bg: camelotColor.bg, text: camelotColor.text, name: camelotColor.name }
      : undefined;
    dto.energy = analysis.energy;
    dto.danceability = analysis.danceability;
    dto.analysisError = analysis.analysisError;
    dto.analyzedAt = analysis.analyzedAt?.toISOString();

    return dto;
  }
}
