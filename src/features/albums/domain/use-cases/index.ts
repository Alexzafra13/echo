// Obtener UN álbum por ID (singular)
export { GetAlbumUseCase, type GetAlbumInput, type GetAlbumOutput } from './get-album';

// Obtener LISTA paginada de álbumes (plural)
export { GetAlbumsUseCase, type GetAlbumsInput, type GetAlbumsOutput, type AlbumOutput } from './get-albums';

// Buscar álbumes
export { SearchAlbumsUseCase, type SearchAlbumsInput, type SearchAlbumsOutput } from './search-albums';