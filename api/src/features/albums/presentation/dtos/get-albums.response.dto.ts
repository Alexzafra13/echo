import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AlbumResponseDto } from './album.response.dto';
import type { Album } from '../../domain/entities/album.entity';
import type { AlbumProps } from '../../domain/entities/album.entity';

/**
 * Tipo para datos de la respuesta paginada de álbumes
 */
interface GetAlbumsResult {
  data: (Album | AlbumProps)[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

/**
 * GetAlbumsResponseDto - DTO de respuesta para lista paginada de álbumes
 */
export class GetAlbumsResponseDto {
  @ApiProperty({ type: [AlbumResponseDto], description: 'Lista de álbumes' })
  @Expose()
  @Type(() => AlbumResponseDto)
  data!: AlbumResponseDto[];

  @ApiProperty({ example: 100, description: 'Total de álbumes' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Álbumes omitidos' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 10, description: 'Álbumes retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: true, description: 'Hay más álbumes disponibles' })
  @Expose()
  hasMore!: boolean;

  /**
   * Convierte resultado del use case a DTO de respuesta
   */
  static fromDomain(data: GetAlbumsResult): GetAlbumsResponseDto {
    const dto = new GetAlbumsResponseDto();
    dto.data = data.data.map((album) => AlbumResponseDto.fromDomain(album));
    dto.total = data.total;
    dto.skip = data.skip;
    dto.take = data.take;
    dto.hasMore = data.hasMore;
    return dto;
  }
}