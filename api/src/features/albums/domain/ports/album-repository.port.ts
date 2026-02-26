import { Album } from '../entities/album.entity';

export interface IAlbumRepository {
  findById(id: string): Promise<Album | null>;
  findAll(skip: number, take: number): Promise<Album[]>;
  search(name: string, skip: number, take: number): Promise<Album[]>;
  findByArtistId(artistId: string, skip: number, take: number): Promise<Album[]>;
  findRecent(take: number): Promise<Album[]>;
  findMostPlayed(take: number): Promise<Album[]>;
  findMostPlayedByUser(userId: string, take: number): Promise<Album[]>;
  // Ordena ignorando artículos ("The", "A") y acentos
  findAlphabetically(skip: number, take: number): Promise<Album[]>;
  // Ordena por nombre de artista, luego por nombre de álbum
  findByArtistName(skip: number, take: number): Promise<Album[]>;
  findRecentlyPlayed(userId: string, take: number): Promise<Album[]>;
  findFavorites(userId: string, skip: number, take: number): Promise<Album[]>;
  count(): Promise<number>;
  countByArtistId(artistId: string): Promise<number>;
  create(album: Album): Promise<Album>;
  update(id: string, album: Partial<Album>): Promise<Album | null>;
  delete(id: string): Promise<boolean>;
}

// Token de inyección de dependencias
export const ALBUM_REPOSITORY = 'IAlbumRepository';
