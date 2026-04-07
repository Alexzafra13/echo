import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';
import { ListeningNowService } from '../../../social/domain/services/listening-now.service';

export interface FederationTrackInfo {
  title: string;
  artistName: string;
  albumName: string;
  coverUrl?: string | null;
  serverId: string;
  serverName?: string;
}

export interface UpdatePlaybackStateInput {
  userId: string;
  isPlaying?: boolean;
  currentTrackId?: string | null;
  federationTrack?: FederationTrackInfo | null;
}

@Injectable()
export class UpdatePlaybackStateUseCase {
  constructor(
    @InjectPinoLogger(UpdatePlaybackStateUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
    private readonly listeningNowService: ListeningNowService
  ) {}

  async execute(input: UpdatePlaybackStateInput): Promise<void> {
    const { userId, isPlaying, currentTrackId, federationTrack } = input;

    // Determine final state
    const finalIsPlaying = isPlaying ?? false;
    const finalTrackId = finalIsPlaying ? (currentTrackId ?? null) : null;
    const finalFederationTrack = finalIsPlaying ? (federationTrack ?? null) : null;

    this.logger.debug(
      {
        userId,
        isPlaying: finalIsPlaying,
        currentTrackId: finalTrackId,
        hasFederationTrack: !!finalFederationTrack,
      },
      'Updating playback state'
    );

    // Update database
    await this.repository.updatePlaybackState(
      userId,
      finalIsPlaying,
      finalTrackId,
      finalFederationTrack
    );

    // Emit SSE event for real-time updates to friends
    this.listeningNowService.emitUpdate({
      userId,
      isPlaying: finalIsPlaying,
      currentTrackId: finalTrackId,
      federationTrack: finalFederationTrack,
      timestamp: new Date(),
    });
  }
}
