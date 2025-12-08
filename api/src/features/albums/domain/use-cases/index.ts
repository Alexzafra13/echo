// Obtener UN álbum por ID (singular)
export { GetAlbumUseCase, type GetAlbumInput, type GetAlbumOutput } from './get-album';

// Obtener LISTA paginada de álbumes (plural)
export { GetAlbumsUseCase, type GetAlbumsInput, type GetAlbumsOutput, type AlbumOutput } from './get-albums';

// Buscar álbumes
export { SearchAlbumsUseCase, type SearchAlbumsInput, type SearchAlbumsOutput } from './search-albums';

// Obtener álbumes recientes
export { GetRecentAlbumsUseCase, type GetRecentAlbumsInput, type GetRecentAlbumsOutput } from './get-recent-albums';

// Obtener álbumes más reproducidos
export { GetTopPlayedAlbumsUseCase, type GetTopPlayedAlbumsInput, type GetTopPlayedAlbumsOutput } from './get-top-played-albums';

// Obtener álbum destacado
export { GetFeaturedAlbumUseCase, type GetFeaturedAlbumOutput } from './get-featured-album';

// Obtener tracks de un álbum
export { GetAlbumTracksUseCase, type GetAlbumTracksInput, type GetAlbumTracksOutput } from './get-album-tracks';

// Obtener cover art de un álbum
export { GetAlbumCoverUseCase, type GetAlbumCoverInput, type GetAlbumCoverOutput } from './get-album-cover';

// Obtener álbumes ordenados por artista
export { GetAlbumsByArtistUseCase, type GetAlbumsByArtistInput, type GetAlbumsByArtistOutput } from './get-albums-by-artist/get-albums-by-artist.use-case';