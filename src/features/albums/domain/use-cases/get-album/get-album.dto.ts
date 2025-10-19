/**
 * GetAlbumInput - Datos de entrada para obtener UN álbum por ID
 */
export interface GetAlbumInput {
  id: string;
}

/**
 * GetAlbumOutput - Datos de salida de un álbum individual
 */
export interface GetAlbumOutput {
  id: string;
  name: string;
  artistId?: string;
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