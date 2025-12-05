import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IPlayTrackingRepository, PLAY_TRACKING_REPOSITORY } from '../ports';

export interface UpdatePlaybackStateInput {
  userId: string;
  isPlaying?: boolean;
  currentTrackId?: string | null;
}

@Injectable()
export class UpdatePlaybackStateUseCase {
  constructor(
    @InjectPinoLogger(UpdatePlaybackStateUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly repository: IPlayTrackingRepository,
  ) {}

  async execute(input: UpdatePlaybackStateInput): Promise<void> {
    const { userId, isPlaying, currentTrackId } = input;

    // Determine final state
    const finalIsPlaying = isPlaying ?? false;
    const finalTrackId = finalIsPlaying ? (currentTrackId ?? null) : null;

    this.logger.debug(
      { userId, isPlaying: finalIsPlaying, currentTrackId: finalTrackId },
      'Updating playback state',
    );

    await this.repository.updatePlaybackState(userId, finalIsPlaying, finalTrackId);
  }
}
