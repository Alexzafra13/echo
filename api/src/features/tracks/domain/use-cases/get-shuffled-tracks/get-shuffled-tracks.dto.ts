// Paginación determinística con seed
export interface GetShuffledTracksInput {
  seed?: number;
  skip?: number;
  take?: number;
}

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
    // Normalización de audio (LUFS/ReplayGain)
    rgTrackGain?: number;
    rgTrackPeak?: number;
    rgAlbumGain?: number;
    rgAlbumPeak?: number;
    // Crossfade
    outroStart?: number;
    bpm?: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  // Seed para continuar paginación con mismo orden
  seed: number;
  skip: number;
  take: number;
  hasMore: boolean;
}
