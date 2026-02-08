import { ApiProperty } from '@nestjs/swagger';
import { GetDjShuffledTracksOutput, DjShuffledTrack } from '../../domain/use-cases/get-dj-shuffled-tracks';

export class DjShuffledTrackDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) albumId!: string | null;
  @ApiProperty({ nullable: true }) artistId!: string | null;
  @ApiProperty({ nullable: true }) albumArtistId!: string | null;
  @ApiProperty({ nullable: true }) trackNumber!: number | null;
  @ApiProperty({ nullable: true }) discNumber!: number | null;
  @ApiProperty({ nullable: true }) year!: number | null;
  @ApiProperty({ nullable: true }) duration!: number | null;
  @ApiProperty() path!: string;
  @ApiProperty({ nullable: true }) bitRate!: number | null;
  @ApiProperty({ nullable: true }) size!: number | null;
  @ApiProperty({ nullable: true }) suffix!: string | null;
  @ApiProperty({ nullable: true }) albumName!: string | null;
  @ApiProperty({ nullable: true }) artistName!: string | null;
  @ApiProperty({ nullable: true }) albumArtistName!: string | null;
  @ApiProperty() compilation!: boolean;
  @ApiProperty({ nullable: true }) rgTrackGain!: number | null;
  @ApiProperty({ nullable: true }) rgTrackPeak!: number | null;
  @ApiProperty({ nullable: true }) rgAlbumGain!: number | null;
  @ApiProperty({ nullable: true }) rgAlbumPeak!: number | null;
  @ApiProperty({ nullable: true, description: 'Seconds where outro/silence begins (for smart crossfade)' }) outroStart!: number | null;
  @ApiProperty({ nullable: true, description: 'BPM (beats per minute)' }) bpm!: number | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class DjShuffledTracksResponseDto {
  @ApiProperty({ type: [DjShuffledTrackDto] })
  data!: DjShuffledTrackDto[];

  @ApiProperty({ description: 'Total tracks in library' })
  total!: number;

  @ApiProperty({ description: 'Seed used for this shuffle session' })
  seed!: number;

  @ApiProperty({ description: 'Number of tracks skipped' })
  skip!: number;

  @ApiProperty({ description: 'Number of tracks returned' })
  take!: number;

  @ApiProperty({ description: 'Whether more tracks are available' })
  hasMore!: boolean;

  @ApiProperty({ description: 'Whether DJ-aware ordering was used (true) or fallback to random (false)' })
  djMode!: boolean;

  static fromDomain(output: GetDjShuffledTracksOutput): DjShuffledTracksResponseDto {
    const dto = new DjShuffledTracksResponseDto();
    dto.data = output.data.map((track) => {
      const trackDto = new DjShuffledTrackDto();
      Object.assign(trackDto, track);
      return trackDto;
    });
    dto.total = output.total;
    dto.seed = output.seed;
    dto.skip = output.skip;
    dto.take = output.take;
    dto.hasMore = output.hasMore;
    dto.djMode = output.djMode;
    return dto;
  }
}
