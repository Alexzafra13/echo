/**
 * Input DTO for GetShuffledTracksUseCase
 * Permite paginación determinística con seed
 */
export interface GetShuffledTracksInput {
  /**
   * Seed para el orden aleatorio determinístico (0-1)
   * Si no se provee, se genera uno nuevo
   */
  seed?: number;

  /**
   * Número de tracks a saltar
   * @default 0
   */
  skip?: number;

  /**
   * Número de tracks a retornar
   * @default 50
   */
  take?: number;
}

/**
 * Output DTO for GetShuffledTracksUseCase
 * Incluye metadata para paginación
 */
export interface GetShuffledTracksOutput {
  data: Array<{
    id: string;
    title: string;
    albumId?: string;
    artistId?: string;
    albumArtistId?: string;
    trackNumber?: number;
    discNumber: number;
    year?: number;
    duration?: number;
    path: string;
    bitRate?: number;
    size?: number;
    suffix?: string;
    albumName?: string;
    artistName?: string;
    albumArtistName?: string;
    compilation: boolean;
    // Audio normalization (LUFS/ReplayGain)
    rgTrackGain?: number;
    rgTrackPeak?: number;
    rgAlbumGain?: number;
    rgAlbumPeak?: number;
    // Smart crossfade
    outroStart?: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  /** Total de tracks en la biblioteca */
  total: number;
  /** Seed usado para el orden (permite continuar paginación) */
  seed: number;
  /** Skip usado en esta petición */
  skip: number;
  /** Take usado en esta petición */
  take: number;
  /** Indica si hay más tracks disponibles */
  hasMore: boolean;
}
