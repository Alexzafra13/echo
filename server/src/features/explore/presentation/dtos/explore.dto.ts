import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ExploreQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export class ForgottenAlbumsQueryDto extends ExploreQueryDto {
  @ApiPropertyOptional({ default: 3, minimum: 1, maximum: 12, description: 'Months since last play' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  monthsAgo?: number = 3;
}

export class ExploreAlbumDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  artistId: string | null;

  @ApiPropertyOptional()
  artistName: string | null;

  @ApiPropertyOptional()
  coverArtPath: string | null;

  @ApiPropertyOptional()
  year: number | null;

  @ApiProperty()
  songCount: number;

  @ApiProperty()
  duration: number;
}

export class ExploreTrackDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  albumId: string | null;

  @ApiPropertyOptional()
  albumName: string | null;

  @ApiPropertyOptional()
  artistId: string | null;

  @ApiPropertyOptional()
  artistName: string | null;

  @ApiPropertyOptional()
  coverArtPath: string | null;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  playCount: number;
}

export class ExploreArtistDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  imagePath: string | null;

  @ApiProperty()
  albumCount: number;

  @ApiProperty()
  songCount: number;
}

export class ExploreAlbumsResponseDto {
  @ApiProperty({ type: [ExploreAlbumDto] })
  albums: ExploreAlbumDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}

export class ExploreTracksResponseDto {
  @ApiProperty({ type: [ExploreTrackDto] })
  tracks: ExploreTrackDto[];

  @ApiProperty()
  total: number;
}

export class RandomAlbumResponseDto {
  @ApiPropertyOptional({ type: ExploreAlbumDto })
  album: ExploreAlbumDto | null;
}

export class RandomArtistResponseDto {
  @ApiPropertyOptional({ type: ExploreArtistDto })
  artist: ExploreArtistDto | null;
}

export class RandomAlbumsResponseDto {
  @ApiProperty({ type: [ExploreAlbumDto] })
  albums: ExploreAlbumDto[];
}
