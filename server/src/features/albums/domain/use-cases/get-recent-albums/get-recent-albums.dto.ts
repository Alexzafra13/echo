/**
 * GetRecentAlbumsInput - Datos de entrada para obtener álbumes recientes
 */
export interface GetRecentAlbumsInput {
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
  size: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GetRecentAlbumsOutput - Datos de salida de álbumes recientes
 */
export type GetRecentAlbumsOutput = AlbumOutput[];
