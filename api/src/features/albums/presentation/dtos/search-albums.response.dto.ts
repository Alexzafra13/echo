import { Expose, Type } from 'class-transformer';
import { AlbumResponseDto } from './album.response.dto';

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

  static fromDomain(data: any): SearchAlbumsResponseDto {
    const dto = new SearchAlbumsResponseDto();
    dto.data = data.data.map((album: any) => AlbumResponseDto.fromDomain(album));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.query = data.query;
    dto.hasMore = data.hasMore;
    return dto;
  }
}