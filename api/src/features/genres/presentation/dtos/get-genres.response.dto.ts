import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { GenreResponseDto } from './genre.response.dto';
import type { Genre, GenreProps } from '../../domain/entities/genre.entity';

interface GetGenresResult {
  data: (Genre | GenreProps)[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

export class GetGenresResponseDto {
  @ApiProperty({ type: [GenreResponseDto], description: 'Lista de géneros' })
  @Expose()
  @Type(() => GenreResponseDto)
  data!: GenreResponseDto[];

  @ApiProperty({ example: 42, description: 'Total de géneros' })
  @Expose()
  total!: number;

  @ApiProperty({ example: 0, description: 'Géneros omitidos' })
  @Expose()
  skip!: number;

  @ApiProperty({ example: 20, description: 'Géneros retornados' })
  @Expose()
  take!: number;

  @ApiProperty({ example: true, description: 'Hay más géneros disponibles' })
  @Expose()
  hasMore!: boolean;

  static fromDomain(result: GetGenresResult): GetGenresResponseDto {
    const dto = new GetGenresResponseDto();
    dto.data = result.data.map((g) => GenreResponseDto.fromDomain(g));
    dto.total = result.total;
    dto.skip = result.skip;
    dto.take = result.take;
    dto.hasMore = result.hasMore;
    return dto;
  }
}
