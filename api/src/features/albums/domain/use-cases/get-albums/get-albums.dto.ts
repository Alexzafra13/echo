/**
 * GetAlbumsInput - Datos de entrada para obtener lista de álbumes
 */
export interface GetAlbumsInput {
  skip: number;
  take: number;
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
 * GetAlbumsOutput - Datos de salida de la lista de álbumes
 */
export interface GetAlbumsOutput {
  data: AlbumOutput[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}