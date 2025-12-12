import { Injectable } from '@nestjs/common';
import { ScoringService } from '../services/scoring.service';
import { TrackScore } from '../entities/track-score.types';

@Injectable()
export class CalculateTrackScoreUseCase {
  constructor(private readonly scoringService: ScoringService) {}

  async execute(userId: string, trackId: string, artistId?: string): Promise<TrackScore> {
    return await this.scoringService.calculateFullTrackScore(userId, trackId, artistId);
  }
}
