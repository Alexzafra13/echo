import { Injectable, Inject } from '@nestjs/common';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { GetShuffledTracksInput, GetShuffledTracksOutput } from './get-shuffled-tracks.dto';

/** Tamaño de página por defecto */
const DEFAULT_TAKE = 50;
/** Tamaño máximo de página permitido */
const MAX_TAKE = 100;

@Injectable()
export class GetShuffledTracksUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: GetShuffledTracksInput = {}): Promise<GetShuffledTracksOutput> {
    // Generar seed si no se proporciona (para primera petición)
    const seed = input.seed ?? Math.random();
    const skip = Math.max(0, input.skip ?? 0);
    const take = Math.min(MAX_TAKE, Math.max(1, input.take ?? DEFAULT_TAKE));

    // Obtener tracks paginados con orden determinístico
    const [tracks, total] = await Promise.all([
      this.trackRepository.findShuffledPaginated(seed, skip, take),
      this.trackRepository.count(),
    ]);

    const data = tracks.map((track) => ({
      id: track.id,
      title: track.title,
      albumId: track.albumId,
      artistId: track.artistId,
      albumArtistId: track.albumArtistId,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      year: track.year,
      duration: track.duration,
      path: track.path,
      bitRate: track.bitRate,
      size: track.size,
      suffix: track.suffix,
      albumName: track.albumName,
      artistName: track.artistName,
      albumArtistName: track.albumArtistName,
      compilation: track.compilation,
      // Audio normalization data (LUFS/ReplayGain)
      rgTrackGain: track.rgTrackGain,
      rgTrackPeak: track.rgTrackPeak,
      rgAlbumGain: track.rgAlbumGain,
      rgAlbumPeak: track.rgAlbumPeak,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    }));

    return {
      data,
      total,
      seed,
      skip,
      take,
      hasMore: skip + tracks.length < total,
    };
  }
}
