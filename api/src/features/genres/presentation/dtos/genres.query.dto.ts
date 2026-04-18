import { IsOptional, IsInt, Min, Max, IsEnum, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum GenreSort {
  Name = 'name',
  TrackCount = 'trackCount',
  AlbumCount = 'albumCount',
}

export enum AlbumInGenreSort {
  ReleaseYear = 'releaseYear',
  Title = 'title',
  PlayCount = 'playCount',
}

export enum TrackInGenreSort {
  PlayCount = 'playCount',
  Title = 'title',
  ReleaseYear = 'releaseYear',
}

export enum ArtistInGenreSort {
  Name = 'name',
  AlbumCount = 'albumCount',
  SongCount = 'songCount',
}

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

abstract class PaginationBase {
  @ApiPropertyOptional({ description: 'Items a omitir', minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ description: 'Items a retornar', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Desc })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.Desc;
}

export class ListGenresQueryDto extends PaginationBase {
  @ApiPropertyOptional({ enum: GenreSort, default: GenreSort.TrackCount })
  @IsOptional()
  @IsEnum(GenreSort)
  sort?: GenreSort = GenreSort.TrackCount;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre (case-insensitive)', example: 'rock' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class GenreAlbumsQueryDto extends PaginationBase {
  @ApiPropertyOptional({ enum: AlbumInGenreSort, default: AlbumInGenreSort.ReleaseYear })
  @IsOptional()
  @IsEnum(AlbumInGenreSort)
  sort?: AlbumInGenreSort = AlbumInGenreSort.ReleaseYear;
}

export class GenreTracksQueryDto extends PaginationBase {
  @ApiPropertyOptional({ enum: TrackInGenreSort, default: TrackInGenreSort.PlayCount })
  @IsOptional()
  @IsEnum(TrackInGenreSort)
  sort?: TrackInGenreSort = TrackInGenreSort.PlayCount;
}

export class GenreArtistsQueryDto extends PaginationBase {
  @ApiPropertyOptional({ enum: ArtistInGenreSort, default: ArtistInGenreSort.Name })
  @IsOptional()
  @IsEnum(ArtistInGenreSort)
  sort?: ArtistInGenreSort = ArtistInGenreSort.Name;

  @ApiPropertyOptional({ description: 'Override default ASC for name sort' })
  @IsOptional()
  @IsEnum(SortOrder)
  override order?: SortOrder = SortOrder.Asc;
}
