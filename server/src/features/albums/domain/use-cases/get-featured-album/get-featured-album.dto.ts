/**
 * AlbumOutput - Datos de un álbum en la respuesta
 */
export interface AlbumOutput {
  id: string;
  name: string;
  artistId?: string;
  artistName?: string;
  albumArtistId?: string;
  coverArtPath?: string;
  year?: number;
  releaseDate?: Date;
  compilation: boolean;
  songCount: number;
  duration: number;
  size: bigint;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GetFeaturedAlbumOutput - Datos de salida del álbum destacado
 */
export type GetFeaturedAlbumOutput = AlbumOutput | null;
