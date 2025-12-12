import { Expose, Type } from 'class-transformer';
import { AlbumResponseDto } from './album.response.dto';
import { SearchAlbumsOutput } from '../../domain/use-cases/search-albums/search-albums.dto';

/**
 * SearchAlbumsResponseDto - DTO de respuesta para búsqueda de álbumes
 */
export class SearchAlbumsResponseDto {
  @Expose()
  @Type(() => AlbumResponseDto)
  data!: AlbumResponseDto[];

  @Expose()
  total!: number;

  @Expose()
  skip!: number;

  @Expose()
  take!: number;

  @Expose()
  query!: string;

  @Expose()
  hasMore!: boolean;

  static fromDomain(data: SearchAlbumsOutput): SearchAlbumsResponseDto {
    const dto = new SearchAlbumsResponseDto();
    dto.data = data.data.map((album) => AlbumResponseDto.fromDomain(album));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.query = data.query;
    dto.hasMore = data.hasMore;
    return dto;
  }
}