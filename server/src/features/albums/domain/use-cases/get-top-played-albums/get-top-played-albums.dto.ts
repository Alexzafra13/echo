/**
 * GetTopPlayedAlbumsInput - Datos de entrada para obtener álbumes más reproducidos
 */
export interface GetTopPlayedAlbumsInput {
  take?: number;
}

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
 * GetTopPlayedAlbumsOutput - Datos de salida de álbumes más reproducidos
 */
export type GetTopPlayedAlbumsOutput = AlbumOutput[];
