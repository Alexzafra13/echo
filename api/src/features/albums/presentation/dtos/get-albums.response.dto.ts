import { Expose, Type } from 'class-transformer';
import { AlbumResponseDto } from './album.response.dto';

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

  static fromDomain(data: any): GetAlbumsResponseDto {
    const dto = new GetAlbumsResponseDto();
    dto.data = data.data.map((album: any) => AlbumResponseDto.fromDomain(album));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.hasMore = data.hasMore;
    return dto;
  }
}