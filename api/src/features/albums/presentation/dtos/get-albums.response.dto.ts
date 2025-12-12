import { Expose, Type } from 'class-transformer';
import { AlbumResponseDto } from './album.response.dto';
import { GetAlbumsOutput } from '../../domain/use-cases/get-albums/get-albums.dto';

/**
 * GetAlbumsResponseDto - DTO de respuesta para lista paginada de álbumes
 */
export class GetAlbumsResponseDto {
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
  hasMore!: boolean;

  static fromDomain(data: GetAlbumsOutput): GetAlbumsResponseDto {
    const dto = new GetAlbumsResponseDto();
    dto.data = data.data.map((album) => AlbumResponseDto.fromDomain(album));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.hasMore = data.hasMore;
    return dto;
  }
}